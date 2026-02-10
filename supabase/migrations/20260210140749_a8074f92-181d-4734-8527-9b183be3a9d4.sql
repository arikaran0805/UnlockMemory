
-- Drop the FK constraint that restricts problem_id to only practice_problems
-- This allows storing IDs from predict_output_problems, fix_error_problems, and eliminate_wrong_problems too
ALTER TABLE public.learner_problem_progress
  DROP CONSTRAINT IF EXISTS learner_problem_progress_problem_id_fkey;
