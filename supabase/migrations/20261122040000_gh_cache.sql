-- GitHub data for the site, fetched by the gh function at most every 15 minutes for all visitors.
create table public.gh_cache (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.gh_cache enable row level security;
