
-- Drop FK constraints on problem_id that point to practice_problems
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_reactions_problem_id_fkey') THEN
    ALTER TABLE public.problem_reactions DROP CONSTRAINT problem_reactions_problem_id_fkey;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_bookmarks_problem_id_fkey') THEN
    ALTER TABLE public.problem_bookmarks DROP CONSTRAINT problem_bookmarks_problem_id_fkey;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_comments_problem_id_fkey') THEN
    ALTER TABLE public.problem_comments DROP CONSTRAINT problem_comments_problem_id_fkey;
  END IF;
END $$;

-- Add problem_type column to each table (defaults to 'solve' for existing data)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='problem_reactions' AND column_name='problem_type') THEN
    ALTER TABLE public.problem_reactions ADD COLUMN problem_type text NOT NULL DEFAULT 'solve';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='problem_bookmarks' AND column_name='problem_type') THEN
    ALTER TABLE public.problem_bookmarks ADD COLUMN problem_type text NOT NULL DEFAULT 'solve';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='problem_comments' AND column_name='problem_type') THEN
    ALTER TABLE public.problem_comments ADD COLUMN problem_type text NOT NULL DEFAULT 'solve';
  END IF;
END $$;

-- Add indexes for efficient lookups by problem_id + problem_type
CREATE INDEX IF NOT EXISTS idx_problem_reactions_type ON public.problem_reactions (problem_id, problem_type);
CREATE INDEX IF NOT EXISTS idx_problem_bookmarks_type ON public.problem_bookmarks (problem_id, problem_type);
CREATE INDEX IF NOT EXISTS idx_problem_comments_type ON public.problem_comments (problem_id, problem_type);

-- Update unique constraint on problem_reactions to include problem_type
-- First drop the existing unique constraint if any
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_reactions_problem_id_user_id_key' AND conrelid = 'problem_reactions'::regclass) THEN
    ALTER TABLE public.problem_reactions DROP CONSTRAINT problem_reactions_problem_id_user_id_key;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_reactions_problem_user_type_key') THEN
    ALTER TABLE public.problem_reactions ADD CONSTRAINT problem_reactions_problem_user_type_key UNIQUE (problem_id, user_id, problem_type);
  END IF;
END $$;

-- Update unique constraint on problem_bookmarks to include problem_type
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_bookmarks_problem_id_user_id_key' AND conrelid = 'problem_bookmarks'::regclass) THEN
    ALTER TABLE public.problem_bookmarks DROP CONSTRAINT problem_bookmarks_problem_id_user_id_key;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'problem_bookmarks_problem_user_type_key') THEN
    ALTER TABLE public.problem_bookmarks ADD CONSTRAINT problem_bookmarks_problem_user_type_key UNIQUE (problem_id, user_id, problem_type);
  END IF;
END $$;
