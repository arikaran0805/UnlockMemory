-- Allow authenticated users to read career_assignments (needed to find team members for messaging)
CREATE POLICY "Authenticated users can view career assignments"
ON public.career_assignments FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read user_roles (needed to show role labels in messaging)
CREATE POLICY "Authenticated users can view user roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);