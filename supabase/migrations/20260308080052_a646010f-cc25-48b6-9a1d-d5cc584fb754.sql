ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS discount_price numeric DEFAULT 0;