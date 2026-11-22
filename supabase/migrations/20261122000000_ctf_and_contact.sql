-- CTF scoreboard and the ssh contact relay for pythonhack000.github.io.
-- Every table has RLS on and no policies: only the Edge Functions (service role) touch them.

create table public.ctf_players (
  id uuid primary key default gen_random_uuid(),
  nick text not null check (nick ~ '^[A-Za-z0-9_-]{3,16}$'),
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
create unique index ctf_players_nick_lower on public.ctf_players (lower(nick));

create table public.ctf_solves (
  player_id uuid not null references public.ctf_players (id) on delete cascade,
  flag_id smallint not null check (flag_id between 1 and 7),
  solved_at timestamptz not null default now(),
  primary key (player_id, flag_id)
);

create table public.rate_hits (
  bucket text not null,
  at timestamptz not null default now()
);
create index rate_hits_bucket_at on public.rate_hits (bucket, at);

alter table public.ctf_players enable row level security;
alter table public.ctf_solves enable row level security;
alter table public.rate_hits enable row level security;

create function public.ctf_top(max_rows int default 20)
returns table (nick text, score int, last_solve timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.nick, count(*)::int as score, max(s.solved_at) as last_solve
  from public.ctf_solves s
  join public.ctf_players p on p.id = s.player_id
  group by p.id, p.nick
  order by score desc, last_solve asc
  limit least(greatest(max_rows, 1), 100);
$$;
revoke execute on function public.ctf_top(int) from public, anon, authenticated;
grant execute on function public.ctf_top(int) to service_role;
