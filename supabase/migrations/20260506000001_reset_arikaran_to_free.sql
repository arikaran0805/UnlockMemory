-- Reset arikaran0802@gmail.com to free learner
-- Removes Pro subscription, career selections, and cart items so the
-- purchase flow can be tested from scratch.
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower('arikaran0802@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User arikaran0802@gmail.com not found';
    RETURN;
  END IF;

  -- Remove Pro subscription → isPro becomes false
  DELETE FROM public.subscriptions WHERE user_id = v_user_id;

  -- Remove career selections → ownedCareerIds becomes empty
  DELETE FROM public.user_career_selections WHERE user_id = v_user_id;

  -- Clear checkout cart
  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  RAISE NOTICE 'User % reset to free learner', v_user_id;
END $$;
