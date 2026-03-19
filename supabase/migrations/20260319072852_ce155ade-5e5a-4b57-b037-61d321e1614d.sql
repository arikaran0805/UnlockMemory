
-- Add post ownership columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS created_by_type text NOT NULL DEFAULT 'moderator',
ADD COLUMN IF NOT EXISTS created_by_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_senior_moderator_user_id uuid;

-- Add senior_moderator_user_id to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS senior_moderator_user_id uuid;

-- Create team_members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role_in_team text NOT NULL DEFAULT 'moderator',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create conversation_threads table
CREATE TABLE public.conversation_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_user_id uuid NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  assigned_senior_moderator_user_id uuid,
  assigned_moderator_user_id uuid,
  current_owner_role text NOT NULL DEFAULT 'moderator',
  current_status text NOT NULL DEFAULT 'new',
  routing_type text NOT NULL DEFAULT 'direct_moderator',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create thread_messages table (separate from old conversation_messages)
CREATE TABLE public.thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'learner',
  message_content text NOT NULL,
  message_type text NOT NULL DEFAULT 'normal',
  is_visible_to_learner boolean NOT NULL DEFAULT true,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversation_assignments table
CREATE TABLE public.conversation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  assigned_by_user_id uuid NOT NULL,
  assigned_to_user_id uuid NOT NULL,
  assigned_to_role text NOT NULL,
  from_role text,
  assignment_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversation_status_logs table
CREATE TABLE public.conversation_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by_user_id uuid NOT NULL,
  changed_by_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_status_logs ENABLE ROW LEVEL SECURITY;

-- Enable realtime for thread_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_messages;

-- RLS: team_members
CREATE POLICY "Authenticated users can read team_members"
ON public.team_members FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage team_members"
ON public.team_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: conversation_threads
-- Learners see own threads
CREATE POLICY "Learners see own threads"
ON public.conversation_threads FOR SELECT TO authenticated
USING (learner_user_id = auth.uid());

-- Moderators see assigned threads
CREATE POLICY "Moderators see assigned threads"
ON public.conversation_threads FOR SELECT TO authenticated
USING (assigned_moderator_user_id = auth.uid());

-- Senior Moderators see team threads
CREATE POLICY "Senior moderators see team threads"
ON public.conversation_threads FOR SELECT TO authenticated
USING (assigned_senior_moderator_user_id = auth.uid());

-- Admins see all threads
CREATE POLICY "Admins see all threads"
ON public.conversation_threads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Learners can create threads
CREATE POLICY "Learners can create threads"
ON public.conversation_threads FOR INSERT TO authenticated
WITH CHECK (learner_user_id = auth.uid());

-- Staff can update threads they're assigned to
CREATE POLICY "Staff can update assigned threads"
ON public.conversation_threads FOR UPDATE TO authenticated
USING (
  assigned_moderator_user_id = auth.uid() 
  OR assigned_senior_moderator_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- RLS: thread_messages
CREATE POLICY "Participants can read thread messages"
ON public.thread_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_threads t
    WHERE t.id = thread_id
    AND (
      t.learner_user_id = auth.uid()
      OR t.assigned_moderator_user_id = auth.uid()
      OR t.assigned_senior_moderator_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Participants can insert thread messages"
ON public.thread_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_threads t
    WHERE t.id = thread_id
    AND (
      t.learner_user_id = auth.uid()
      OR t.assigned_moderator_user_id = auth.uid()
      OR t.assigned_senior_moderator_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);

-- RLS: conversation_assignments
CREATE POLICY "Staff can read assignments"
ON public.conversation_assignments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_threads t
    WHERE t.id = thread_id
    AND (
      t.assigned_moderator_user_id = auth.uid()
      OR t.assigned_senior_moderator_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Senior mods and admins can create assignments"
ON public.conversation_assignments FOR INSERT TO authenticated
WITH CHECK (
  assigned_by_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'senior_moderator')
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- RLS: conversation_status_logs
CREATE POLICY "Staff can read status logs"
ON public.conversation_status_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_threads t
    WHERE t.id = thread_id
    AND (
      t.learner_user_id = auth.uid()
      OR t.assigned_moderator_user_id = auth.uid()
      OR t.assigned_senior_moderator_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);

CREATE POLICY "Staff can insert status logs"
ON public.conversation_status_logs FOR INSERT TO authenticated
WITH CHECK (
  changed_by_user_id = auth.uid()
);

-- Update trigger for conversation_threads
CREATE TRIGGER update_conversation_threads_updated_at
  BEFORE UPDATE ON public.conversation_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update trigger for thread_messages
CREATE TRIGGER update_thread_messages_updated_at
  BEFORE UPDATE ON public.thread_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
