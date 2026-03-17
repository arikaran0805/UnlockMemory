
-- Team connections table
CREATE TABLE public.team_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connected_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  connection_type text NOT NULL DEFAULT 'mentor',
  display_name text NOT NULL,
  avatar_url text,
  role_label text NOT NULL DEFAULT 'Mentor',
  status text NOT NULL DEFAULT 'active',
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.team_connections(id) ON DELETE CASCADE,
  lesson_id uuid,
  conversation_type text NOT NULL DEFAULT 'direct',
  last_message_preview text,
  last_message_at timestamptz,
  unread_count_learner int NOT NULL DEFAULT 0,
  unread_count_team int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id, connection_id)
);

-- Conversation messages table
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'learner',
  sender_id uuid NOT NULL,
  message_text text,
  message_type text NOT NULL DEFAULT 'text',
  attachment_url text,
  attachment_name text,
  attachment_size bigint,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_team_connections_learner ON public.team_connections(learner_id);
CREATE INDEX idx_team_connections_last_msg ON public.team_connections(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_learner ON public.conversations(learner_id);
CREATE INDEX idx_conversations_connection ON public.conversations(connection_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conv_messages_conversation ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conv_messages_created ON public.conversation_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.team_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Learners see own connections" ON public.team_connections
  FOR SELECT TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Learners insert own connections" ON public.team_connections
  FOR INSERT TO authenticated WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners update own connections" ON public.team_connections
  FOR UPDATE TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Learners see own conversations" ON public.conversations
  FOR SELECT TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Learners insert own conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Learners update own conversations" ON public.conversations
  FOR UPDATE TO authenticated USING (learner_id = auth.uid());

CREATE POLICY "Participants see conversation messages" ON public.conversation_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.learner_id = auth.uid()));

CREATE POLICY "Participants insert messages" ON public.conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.learner_id = auth.uid()));

CREATE POLICY "Participants update messages" ON public.conversation_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.learner_id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;

-- Updated_at triggers
CREATE TRIGGER update_team_connections_updated_at
  BEFORE UPDATE ON public.team_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
