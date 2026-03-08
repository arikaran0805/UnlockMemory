
-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_discount NUMERIC,
  applies_to_type TEXT NOT NULL DEFAULT 'entire_website' CHECK (applies_to_type IN ('entire_website', 'all_careers', 'all_courses', 'specific_careers', 'specific_courses')),
  applies_to_ids UUID[] DEFAULT '{}',
  min_purchase NUMERIC DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER,
  start_date TIMESTAMPTZ DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create promo_code_redemptions table
CREATE TABLE public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id TEXT,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for promo_codes
CREATE POLICY "Admins can manage promo_codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public read for active promo codes (needed for checkout validation)
CREATE POLICY "Anyone can read active promo_codes" ON public.promo_codes
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admin-only policies for redemptions
CREATE POLICY "Admins can manage redemptions" ON public.promo_code_redemptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own redemptions
CREATE POLICY "Users can insert own redemptions" ON public.promo_code_redemptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own redemptions
CREATE POLICY "Users can read own redemptions" ON public.promo_code_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
