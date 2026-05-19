-- Contact form submissions table
create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  topic       text not null,
  message     text not null,
  status      text not null default 'unread',
  created_at  timestamptz not null default now()
);

-- Row-level security: anyone (including anonymous) can insert,
-- only the service role (admin dashboard / Supabase Studio) can read.
alter table contact_submissions enable row level security;

create policy "Anyone can submit contact form"
  on contact_submissions
  for insert
  to anon, authenticated
  with check (true);
