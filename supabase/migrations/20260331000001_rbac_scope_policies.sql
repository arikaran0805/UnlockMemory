-- ============================================================
-- RBAC SCOPE POLICIES
-- Comprehensive row-level security for team/career/course access
-- ============================================================

-- ── TEAMS ────────────────────────────────────────────────────

-- Drop old policies before replacing
DROP POLICY IF EXISTS "Admins can manage all teams" ON public.teams;
DROP POLICY IF EXISTS "Super moderators can view assigned teams" ON public.teams;
DROP POLICY IF EXISTS "teams_select_scope" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_update" ON public.teams;
DROP POLICY IF EXISTS "teams_admin_delete" ON public.teams;

CREATE POLICY "teams_select_scope" ON public.teams
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.career_assignments
    WHERE user_id = auth.uid() AND career_id = teams.career_id
  )
);

CREATE POLICY "teams_admin_insert" ON public.teams
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teams_admin_update" ON public.teams
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teams_admin_delete" ON public.teams
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ── CAREER ASSIGNMENTS ───────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage career assignments" ON public.career_assignments;
DROP POLICY IF EXISTS "Super Moderators can view own assignments" ON public.career_assignments;
DROP POLICY IF EXISTS "career_assignments_select" ON public.career_assignments;
DROP POLICY IF EXISTS "career_assignments_insert" ON public.career_assignments;
DROP POLICY IF EXISTS "career_assignments_delete" ON public.career_assignments;

CREATE POLICY "career_assignments_select" ON public.career_assignments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "career_assignments_insert" ON public.career_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "career_assignments_delete" ON public.career_assignments
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ── COURSE ASSIGNMENTS ───────────────────────────────────────

DROP POLICY IF EXISTS "course_assignments_select" ON public.course_assignments;
DROP POLICY IF EXISTS "course_assignments_insert" ON public.course_assignments;
DROP POLICY IF EXISTS "course_assignments_delete" ON public.course_assignments;

-- Allow existing admin policies to remain if named differently; clean up known names
DO $$
BEGIN
  -- Drop any existing policies that might conflict
  PERFORM 1; -- no-op if nothing to clean
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_assignments_select" ON public.course_assignments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    WHERE ca.user_id = auth.uid() AND ca.team_id = course_assignments.team_id
  )
);

CREATE POLICY "course_assignments_insert" ON public.course_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    WHERE ca.user_id = auth.uid() AND ca.team_id = course_assignments.team_id
  )
);

CREATE POLICY "course_assignments_delete" ON public.course_assignments
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    WHERE ca.user_id = auth.uid() AND ca.team_id = course_assignments.team_id
  )
);

-- ── COURSES ──────────────────────────────────────────────────

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses_select_scope" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;

CREATE POLICY "courses_select_scope" ON public.courses
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.course_assignments
    WHERE user_id = auth.uid() AND course_id = courses.id
  )
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    JOIN public.career_courses cc ON cc.career_id = ca.career_id
    WHERE ca.user_id = auth.uid() AND cc.course_id = courses.id
  )
);

CREATE POLICY "courses_insert" ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_moderator')
  )
);

CREATE POLICY "courses_update" ON public.courses
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.course_assignments
    WHERE user_id = auth.uid() AND course_id = courses.id
  )
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    JOIN public.career_courses cc ON cc.career_id = ca.career_id
    WHERE ca.user_id = auth.uid() AND cc.course_id = courses.id
  )
);

CREATE POLICY "courses_delete" ON public.courses
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_moderator')
    AND EXISTS (
      SELECT 1 FROM public.career_assignments ca
      JOIN public.career_courses cc ON cc.career_id = ca.career_id
      WHERE ca.user_id = auth.uid() AND cc.course_id = courses.id
    )
  )
);

-- ── PRACTICE SKILLS (formerly practice_labs) ─────────────────

ALTER TABLE public.practice_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_skills_select_scope" ON public.practice_skills;
DROP POLICY IF EXISTS "practice_skills_insert" ON public.practice_skills;
DROP POLICY IF EXISTS "practice_skills_delete" ON public.practice_skills;

CREATE POLICY "practice_skills_select_scope" ON public.practice_skills
FOR SELECT TO authenticated
USING (
  -- Admin sees all
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  -- No course_id = custom collection, admin and super_mod can see
  OR (
    practice_skills.course_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_moderator')
    )
  )
  -- Course-linked: user assigned to that course
  OR EXISTS (
    SELECT 1 FROM public.course_assignments ca
    WHERE ca.user_id = auth.uid() AND ca.course_id = practice_skills.course_id
  )
  -- Course-linked via career (super_moderator)
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    JOIN public.career_courses cc ON cc.career_id = ca.career_id
    WHERE ca.user_id = auth.uid() AND cc.course_id = practice_skills.course_id
  )
);

CREATE POLICY "practice_skills_insert" ON public.practice_skills
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_moderator')
  )
);

CREATE POLICY "practice_skills_delete" ON public.practice_skills
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_moderator')
    AND (
      practice_skills.course_id IS NULL -- own custom collections
      OR EXISTS (
        SELECT 1 FROM public.career_assignments ca
        JOIN public.career_courses cc ON cc.career_id = ca.career_id
        WHERE ca.user_id = auth.uid() AND cc.course_id = practice_skills.course_id
      )
    )
  )
);

CREATE POLICY "practice_skills_update" ON public.practice_skills
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.career_assignments ca
    JOIN public.career_courses cc ON cc.career_id = ca.career_id
    WHERE ca.user_id = auth.uid() AND cc.course_id = practice_skills.course_id
  )
  OR EXISTS (
    SELECT 1 FROM public.course_assignments ca
    WHERE ca.user_id = auth.uid() AND ca.course_id = practice_skills.course_id
  )
);
