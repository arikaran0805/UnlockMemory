-- Ensure arikaran0802@gmail.com has an active pro subscription
-- Uses a DO block to reliably upsert the subscription record
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user id (case-insensitive email match)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('arikaran0802@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User arikaran0802@gmail.com not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user_id: %', v_user_id;

  -- Delete existing subscription if any
  DELETE FROM public.subscriptions WHERE user_id = v_user_id;

  -- Insert fresh pro subscription with no expiry
  INSERT INTO public.subscriptions (
    user_id, plan, status, cancel_at_period_end,
    current_period_start, current_period_end
  ) VALUES (
    v_user_id, 'pro', 'active', false,
    now(), NULL
  );

  RAISE NOTICE 'Pro subscription inserted for user %', v_user_id;
END $$;
