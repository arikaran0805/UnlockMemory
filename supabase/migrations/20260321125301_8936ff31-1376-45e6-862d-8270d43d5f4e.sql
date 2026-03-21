-- Allow both learners and their connected staff member to access the specific connection row
CREATE POLICY "Connected participants see own connections"
ON public.team_connections
FOR SELECT
TO authenticated
USING (
  learner_id = auth.uid()
  OR connected_user_id = auth.uid()
);

CREATE POLICY "Connected participants update own connections"
ON public.team_connections
FOR UPDATE
TO authenticated
USING (
  learner_id = auth.uid()
  OR connected_user_id = auth.uid()
)
WITH CHECK (
  learner_id = auth.uid()
  OR connected_user_id = auth.uid()
);

-- Allow the connected staff participant to find and update the learner conversation
CREATE POLICY "Connected participants see conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  learner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_connections tc
    WHERE tc.id = conversations.connection_id
      AND tc.status = 'active'
      AND tc.connected_user_id = auth.uid()
  )
);

CREATE POLICY "Connected participants update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  learner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_connections tc
    WHERE tc.id = conversations.connection_id
      AND tc.status = 'active'
      AND tc.connected_user_id = auth.uid()
  )
)
WITH CHECK (
  learner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_connections tc
    WHERE tc.id = conversations.connection_id
      AND tc.status = 'active'
      AND tc.connected_user_id = auth.uid()
  )
);

-- Allow the connected staff participant to insert mirrored replies into the learner conversation
CREATE POLICY "Connected participants insert conversation messages"
ON public.conversation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.team_connections tc ON tc.id = c.connection_id
    WHERE c.id = conversation_messages.conversation_id
      AND tc.status = 'active'
      AND (
        c.learner_id = auth.uid()
        OR tc.connected_user_id = auth.uid()
      )
  )
);