
-- Add comparison_mode column to fix_error_problems
-- Supports: exact, trimmed, numeric_tolerance, json_deep
ALTER TABLE public.fix_error_problems
  ADD COLUMN IF NOT EXISTS comparison_mode text NOT NULL DEFAULT 'trimmed';

-- Add optional hint_category to test cases is handled via JSON, no schema change needed
