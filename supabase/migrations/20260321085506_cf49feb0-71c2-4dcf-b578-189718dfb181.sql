CREATE POLICY "Authenticated users can view course assignments"
ON public.course_assignments
FOR SELECT
TO authenticated
USING (true);