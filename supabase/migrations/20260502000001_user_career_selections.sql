-- Create user_career_selections table to persistently store each user's
-- planned course selection per career (separate from the checkout cart).
-- This enables Career Readiness and CareerCourseDetail to respect per-user selections.

CREATE TABLE IF NOT EXISTS public.user_career_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  selected_course_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, career_id)
);

ALTER TABLE public.user_career_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own career selections"
  ON public.user_career_selections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_career_selections_updated_at
  BEFORE UPDATE ON public.user_career_selections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
