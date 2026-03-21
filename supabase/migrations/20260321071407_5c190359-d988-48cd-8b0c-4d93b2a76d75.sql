-- Allow learners to delete their own connections
CREATE POLICY "Learners delete own connections"
ON public.team_connections
FOR DELETE
USING (learner_id = auth.uid());

-- Allow learners to delete their own conversations
CREATE POLICY "Learners delete own conversations"
ON public.conversations
FOR DELETE
USING (learner_id = auth.uid());

-- Allow learners to delete messages from their own conversations
CREATE POLICY "Learners delete own conversation messages"
ON public.conversation_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_messages.conversation_id
      AND c.learner_id = auth.uid()
  )
);