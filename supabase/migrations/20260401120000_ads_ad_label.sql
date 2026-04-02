-- Add ad_label column to ads table
-- Allowed values: 'sponsored', 'partner', 'recommended' (nullable)
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS ad_label text
    CHECK (ad_label IN ('sponsored', 'partner', 'recommended'));
