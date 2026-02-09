
-- Create problem_shares table to track share events across all problem types
CREATE TABLE public.problem_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id uuid NOT NULL,
  problem_type text NOT NULL DEFAULT 'solve',
  user_id uuid,
  session_id text NOT NULL,
  platform text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.problem_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can insert shares (even anonymous)
CREATE POLICY "Anyone can insert problem shares"
  ON public.problem_shares FOR INSERT
  WITH CHECK (true);

-- Admins can view all shares
CREATE POLICY "Admins can view all problem shares"
  ON public.problem_shares FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for analytics queries
CREATE INDEX idx_problem_shares_problem_type ON public.problem_shares (problem_id, problem_type);
