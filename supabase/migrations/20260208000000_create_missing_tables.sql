-- ============================================================
-- Missing tables that were created directly in the old project
-- and never had a migration file. Must run before 20260209*.
-- ============================================================

-- courses
CREATE TABLE IF NOT EXISTS public.courses (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  slug                     text not null unique,
  description              text,
  featured_image           text,
  icon                     text,
  status                   text not null default 'draft',
  level                    text,
  learning_hours           numeric,
  original_price           numeric,
  discount_price           numeric,
  featured                 boolean default false,
  prerequisites            text[],
  author_id                uuid references auth.users(id) on delete set null,
  assigned_to              uuid references auth.users(id) on delete set null,
  default_senior_moderator uuid references auth.users(id) on delete set null,
  deleted_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz
);

-- problem_reactions
CREATE TABLE IF NOT EXISTS public.problem_reactions (
  id            uuid primary key default gen_random_uuid(),
  problem_id    text not null,
  problem_type  text not null default 'solve',
  reaction_type text not null,
  user_id       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint problem_reactions_problem_user_type_key unique (problem_id, user_id, problem_type)
);

CREATE INDEX IF NOT EXISTS idx_problem_reactions_type ON public.problem_reactions (problem_id, problem_type);

-- problem_bookmarks
CREATE TABLE IF NOT EXISTS public.problem_bookmarks (
  id           uuid primary key default gen_random_uuid(),
  problem_id   text not null,
  problem_type text not null default 'solve',
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint problem_bookmarks_problem_user_type_key unique (problem_id, user_id, problem_type)
);

CREATE INDEX IF NOT EXISTS idx_problem_bookmarks_type ON public.problem_bookmarks (problem_id, problem_type);

-- problem_comments
CREATE TABLE IF NOT EXISTS public.problem_comments (
  id           uuid primary key default gen_random_uuid(),
  problem_id   text not null,
  problem_type text not null default 'solve',
  content      text not null,
  status       text not null default 'active',
  parent_id    uuid references public.problem_comments(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_problem_comments_type ON public.problem_comments (problem_id, problem_type);
