-- Who is writing, without tracking anyone: the site keeps a random id in the visitor's browser and
-- sends it with the browser's time zone and language. Only a hash of the id is stored here, for 30 days,
-- so the bot can say "3rd chat, last time as Ann, 2 days ago" instead of showing a stranger.
create table public.chat_visitors (
  id_hash    text primary key,
  chats      integer not null default 0,
  last_name  text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
alter table public.chat_visitors enable row level security;

alter table public.chat_sessions
  add column tz text,
  add column lang text,
  add column visitor_chats integer,          -- this chat's number for that browser (1 = first time)
  add column visitor_prev_name text,
  add column visitor_prev_at timestamptz;

create or replace function public.expire_chat()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.chat_messages where created_at < now() - interval '24 hours';
  delete from public.chat_sessions where coalesce(last_message_at, created_at) < now() - interval '24 hours';
  delete from public.rate_hits where at < now() - interval '24 hours';
  delete from public.chat_visitors where last_seen < now() - interval '30 days';
$$;
revoke execute on function public.expire_chat() from public, anon, authenticated;
