-- Make arikaran0802@gmail.com a pro learner
-- Upserts a subscription record with active pro status (no expiry)
INSERT INTO public.subscriptions (user_id, plan, status, cancel_at_period_end)
SELECT
  id AS user_id,
  'pro' AS plan,
  'active' AS status,
  false AS cancel_at_period_end
FROM auth.users
WHERE email = 'arikaran0802@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET plan = 'pro',
      status = 'active',
      cancel_at_period_end = false,
      current_period_end = NULL,
      updated_at = now();
