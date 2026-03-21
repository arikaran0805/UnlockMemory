
-- Allow senders to update their own conversation_messages (for edit)
CREATE POLICY "Senders can update own messages"
ON public.conversation_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Allow senders to delete their own conversation_messages
CREATE POLICY "Senders can delete own messages"
ON public.conversation_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- Allow senders to update their own thread_messages (for edit)
CREATE POLICY "Senders can update own thread messages"
ON public.thread_messages FOR UPDATE TO authenticated
USING (sender_user_id = auth.uid())
WITH CHECK (sender_user_id = auth.uid());

-- Allow senders to delete their own thread_messages
CREATE POLICY "Senders can delete own thread messages"
ON public.thread_messages FOR DELETE TO authenticated
USING (sender_user_id = auth.uid());
