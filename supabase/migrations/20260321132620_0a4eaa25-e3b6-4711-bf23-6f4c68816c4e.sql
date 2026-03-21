-- 1. Add presence columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- 2. Add message delivery status columns to conversation_messages
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_messages_status ON public.conversation_messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_sender ON public.conversation_messages(conversation_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- 4. RLS: Allow users to update their own presence
CREATE POLICY "Users can update own presence"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Enable realtime for profiles (presence changes)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;