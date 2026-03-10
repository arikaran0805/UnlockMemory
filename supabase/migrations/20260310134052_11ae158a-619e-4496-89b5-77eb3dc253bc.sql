-- Fix all FK constraints referencing auth.users to allow user deletion

-- approval_history.performed_by
ALTER TABLE public.approval_history DROP CONSTRAINT approval_history_performed_by_fkey;
ALTER TABLE public.approval_history ADD CONSTRAINT approval_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_history ALTER COLUMN performed_by DROP NOT NULL;

-- career_assignments.assigned_by
ALTER TABLE public.career_assignments DROP CONSTRAINT career_assignments_assigned_by_fkey;
ALTER TABLE public.career_assignments ADD CONSTRAINT career_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- careers.author_id
ALTER TABLE public.careers DROP CONSTRAINT careers_author_id_fkey;
ALTER TABLE public.careers ADD CONSTRAINT careers_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- certificates.approved_by
ALTER TABLE public.certificates DROP CONSTRAINT certificates_approved_by_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- course_assignments.assigned_by
ALTER TABLE public.course_assignments DROP CONSTRAINT course_assignments_assigned_by_fkey;
ALTER TABLE public.course_assignments ADD CONSTRAINT course_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- course_lessons.created_by
ALTER TABLE public.course_lessons DROP CONSTRAINT course_lessons_created_by_fkey;
ALTER TABLE public.course_lessons ADD CONSTRAINT course_lessons_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- courses.author_id
ALTER TABLE public.courses DROP CONSTRAINT courses_author_id_fkey;
ALTER TABLE public.courses ADD CONSTRAINT courses_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- courses.assigned_to
ALTER TABLE public.courses DROP CONSTRAINT courses_assigned_to_fkey;
ALTER TABLE public.courses ADD CONSTRAINT courses_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- courses.default_senior_moderator
ALTER TABLE public.courses DROP CONSTRAINT courses_default_senior_moderator_fkey;
ALTER TABLE public.courses ADD CONSTRAINT courses_default_senior_moderator_fkey FOREIGN KEY (default_senior_moderator) REFERENCES auth.users(id) ON DELETE SET NULL;

-- invitations.invited_by
ALTER TABLE public.invitations DROP CONSTRAINT invitations_invited_by_fkey;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- posts.assigned_to
ALTER TABLE public.posts DROP CONSTRAINT posts_assigned_to_fkey;
ALTER TABLE public.posts ADD CONSTRAINT posts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- posts.approved_by
ALTER TABLE public.posts DROP CONSTRAINT fk_posts_approved_by;
ALTER TABLE public.posts ADD CONSTRAINT fk_posts_approved_by FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- practice_problems.created_by
ALTER TABLE public.practice_problems DROP CONSTRAINT practice_problems_created_by_fkey;
ALTER TABLE public.practice_problems ADD CONSTRAINT practice_problems_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- practice_skills.created_by
ALTER TABLE public.practice_skills DROP CONSTRAINT practice_skills_created_by_fkey;
ALTER TABLE public.practice_skills ADD CONSTRAINT practice_skills_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- problem_comments.user_id
ALTER TABLE public.problem_comments DROP CONSTRAINT problem_comments_user_id_fkey;
ALTER TABLE public.problem_comments ADD CONSTRAINT problem_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- problem_mappings.created_by
ALTER TABLE public.problem_mappings DROP CONSTRAINT problem_mappings_created_by_fkey;
ALTER TABLE public.problem_mappings ADD CONSTRAINT problem_mappings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- session_invalidations.created_by
ALTER TABLE public.session_invalidations DROP CONSTRAINT session_invalidations_created_by_fkey;
ALTER TABLE public.session_invalidations ADD CONSTRAINT session_invalidations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- sub_topics.created_by
ALTER TABLE public.sub_topics DROP CONSTRAINT sub_topics_created_by_fkey;
ALTER TABLE public.sub_topics ADD CONSTRAINT sub_topics_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- tags.author_id (already changed but showing as NO ACTION)
ALTER TABLE public.tags DROP CONSTRAINT tags_author_id_fkey;
ALTER TABLE public.tags ADD CONSTRAINT tags_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- teams.created_by
ALTER TABLE public.teams DROP CONSTRAINT teams_created_by_fkey;
ALTER TABLE public.teams ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;