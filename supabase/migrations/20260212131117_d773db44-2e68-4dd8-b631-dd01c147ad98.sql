
-- =====================================================
-- Senior Moderator: Scoped access to ASSIGNED courses only
-- Uses existing is_assigned_to_course(_user_id, _course_id) function
-- =====================================================

-- 1. COURSES: Senior Moderators can view their assigned courses
CREATE POLICY "Senior moderators can view assigned courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), id)
);

-- 2. COURSES: Senior Moderators can update assigned courses (but NOT change status to published)
CREATE POLICY "Senior moderators can update assigned courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), id)
)
WITH CHECK (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), id)
  AND status IN ('draft', 'pending', 'pending_approval', 'approved')
);

-- 3. POSTS: Senior Moderators can view posts in their assigned courses
CREATE POLICY "Senior moderators can view posts in assigned courses"
ON public.posts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), category_id)
);

-- 4. POSTS: Senior Moderators can update posts in assigned courses (restricted status)
CREATE POLICY "Senior moderators can update posts in assigned courses"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), category_id)
)
WITH CHECK (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), category_id)
  AND status IN ('draft', 'pending', 'pending_approval', 'approved')
);

-- 5. COURSE_LESSONS: Senior Moderators can view lessons in assigned courses
CREATE POLICY "Senior moderators can view assigned course lessons"
ON public.course_lessons
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
);

-- 6. COURSE_LESSONS: Senior Moderators can manage lessons in assigned courses
CREATE POLICY "Senior moderators can manage assigned course lessons"
ON public.course_lessons
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
)
WITH CHECK (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
);

-- 7. COURSE_VERSIONS: Senior Moderators can view versions of assigned courses
CREATE POLICY "Senior moderators can view assigned course versions"
ON public.course_versions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
);

-- 8. COURSE_VERSIONS: Senior Moderators can insert/update versions of assigned courses
CREATE POLICY "Senior moderators can manage assigned course versions"
ON public.course_versions
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
)
WITH CHECK (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
  AND status IN ('draft', 'pending', 'pending_approval')
);

-- 9. COURSE_ANNOTATIONS: Senior Moderators can manage annotations on assigned courses
CREATE POLICY "Senior moderators can view assigned course annotations"
ON public.course_annotations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
);

CREATE POLICY "Senior moderators can manage assigned course annotations"
ON public.course_annotations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
)
WITH CHECK (
  has_role(auth.uid(), 'senior_moderator')
  AND is_assigned_to_course(auth.uid(), course_id)
);
