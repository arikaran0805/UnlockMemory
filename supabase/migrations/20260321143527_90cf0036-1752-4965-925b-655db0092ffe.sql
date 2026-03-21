
-- Doubt threads table (linked to conversation_threads)
CREATE TABLE public.doubt_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_thread_id UUID REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  learner_user_id UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'lesson',
  source_id TEXT,
  source_title TEXT,
  source_url TEXT,
  course_id UUID,
  lesson_id UUID,
  post_id UUID,
  quiz_id TEXT,
  practice_id TEXT,
  routed_mode TEXT NOT NULL DEFAULT 'direct_owner',
  assigned_user_id UUID,
  assigned_team_id UUID,
  current_owner_role TEXT DEFAULT 'moderator',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doubt assignments history
CREATE TABLE public.doubt_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doubt_thread_id UUID NOT NULL REFERENCES public.doubt_threads(id) ON DELETE CASCADE,
  from_user_id UUID,
  to_user_id UUID,
  from_role TEXT,
  to_role TEXT,
  assignment_type TEXT NOT NULL DEFAULT 'initial',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doubt events timeline
CREATE TABLE public.doubt_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doubt_thread_id UUID NOT NULL REFERENCES public.doubt_threads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_doubt_threads_learner ON public.doubt_threads(learner_user_id);
CREATE INDEX idx_doubt_threads_status ON public.doubt_threads(status);
CREATE INDEX idx_doubt_threads_source ON public.doubt_threads(source_type, source_id);
CREATE INDEX idx_doubt_threads_assigned ON public.doubt_threads(assigned_user_id);
CREATE INDEX idx_doubt_threads_conversation ON public.doubt_threads(conversation_thread_id);
CREATE INDEX idx_doubt_assignments_thread ON public.doubt_assignments(doubt_thread_id);
CREATE INDEX idx_doubt_events_thread ON public.doubt_events(doubt_thread_id);

-- Updated_at trigger
CREATE TRIGGER update_doubt_threads_updated_at
  BEFORE UPDATE ON public.doubt_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.doubt_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_events ENABLE ROW LEVEL SECURITY;

-- Learners can view their own doubt threads
CREATE POLICY "Learners can view own doubts" ON public.doubt_threads
  FOR SELECT USING (auth.uid() = learner_user_id);

-- Learners can create doubt threads
CREATE POLICY "Learners can create doubts" ON public.doubt_threads
  FOR INSERT WITH CHECK (auth.uid() = learner_user_id);

-- Staff can view doubt threads assigned to them or their team
CREATE POLICY "Staff can view assigned doubts" ON public.doubt_threads
  FOR SELECT USING (
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'senior_moderator') OR
    public.has_role(auth.uid(), 'super_moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Staff can update doubt threads
CREATE POLICY "Staff can update doubts" ON public.doubt_threads
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'senior_moderator') OR
    public.has_role(auth.uid(), 'super_moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Doubt assignments: staff can view
CREATE POLICY "Staff can view doubt assignments" ON public.doubt_assignments
  FOR SELECT USING (
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'senior_moderator') OR
    public.has_role(auth.uid(), 'super_moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Learners can view assignments for own doubts
CREATE POLICY "Learners can view own doubt assignments" ON public.doubt_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = doubt_thread_id AND dt.learner_user_id = auth.uid()
    )
  );

-- Staff can insert assignments
CREATE POLICY "Staff can create doubt assignments" ON public.doubt_assignments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'senior_moderator') OR
    public.has_role(auth.uid(), 'super_moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Anyone authenticated can insert assignments (for auto-routing)
CREATE POLICY "Authenticated can create doubt assignments" ON public.doubt_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Events: viewable by staff
CREATE POLICY "Staff can view doubt events" ON public.doubt_events
  FOR SELECT USING (
    public.has_role(auth.uid(), 'moderator') OR
    public.has_role(auth.uid(), 'senior_moderator') OR
    public.has_role(auth.uid(), 'super_moderator') OR
    public.has_role(auth.uid(), 'admin')
  );

-- Events: insertable by authenticated
CREATE POLICY "Authenticated can create doubt events" ON public.doubt_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Learners can view events for own doubts
CREATE POLICY "Learners can view own doubt events" ON public.doubt_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.doubt_threads dt
      WHERE dt.id = doubt_thread_id AND dt.learner_user_id = auth.uid()
    )
  );

-- Enable realtime for doubt_threads
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubt_threads;
