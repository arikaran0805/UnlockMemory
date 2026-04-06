-- Migration: team_ownership_approval
-- Adapts the spec's senior_moderators/course_moderators tables to the actual schema,
-- where both roles live as rows in course_assignments (role IN ('senior_moderator','moderator')).

-- 1. Add routing columns to course_assignments
--    super_moderator_id  : the career-level super_mod linked to this assignment
--    default_senior_moderator_id : (moderator rows only) which senior_mod receives their submissions
ALTER TABLE course_assignments
  ADD COLUMN IF NOT EXISTS super_moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_senior_moderator_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Approval tasks table
CREATE TABLE IF NOT EXISTS approval_tasks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  career_id         uuid        NOT NULL REFERENCES careers(id)  ON DELETE CASCADE,
  course_id         uuid                 REFERENCES courses(id)  ON DELETE CASCADE,
  submitted_by      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitter_role    text        NOT NULL CHECK (submitter_role IN ('moderator', 'senior_moderator')),
  content_type      text        NOT NULL,   -- 'post' | 'lesson' | 'practice_lab'
  content_id        uuid        NOT NULL,
  assigned_to       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected', 'reassigned')),
  reassigned_by     uuid                 REFERENCES profiles(id),
  reassigned_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approval_tasks_updated_at ON approval_tasks;
CREATE TRIGGER approval_tasks_updated_at
  BEFORE UPDATE ON approval_tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
