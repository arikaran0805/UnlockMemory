create table announcement_bars (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  message     text not null,
  link_text   text,
  link_url    text,
  bg_color    text not null default '#18181b',
  text_color  text not null default '#ffffff',
  is_enabled  boolean not null default true,
  start_date  timestamptz,
  end_date    timestamptz,
  priority    int not null default 0,
  target_type text not null default 'entire_site',
  target_ids  jsonb not null default '[]',
  audience    text not null default 'all',
  created_at  timestamptz not null default now()
);
