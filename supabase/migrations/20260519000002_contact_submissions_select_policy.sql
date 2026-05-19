-- Allow authenticated users (admins) to read contact submissions.
-- Route-level AdminGuard handles role enforcement in the app.
create policy "Authenticated users can read contact submissions"
  on contact_submissions
  for select
  to authenticated
  using (true);
