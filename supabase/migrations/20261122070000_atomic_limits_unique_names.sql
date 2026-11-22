-- 1. Rate limiting in one transaction: a burst of parallel requests used to read the same count
--    and all pass. A per-bucket advisory lock serialises check and insert.
create function public.rate_hit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(secs => p_window_seconds);
  hits integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_bucket));
  delete from public.rate_hits where bucket = p_bucket and at < since;
  select count(*) into hits from public.rate_hits where bucket = p_bucket and at >= since;
  if hits >= p_max then
    return false;
  end if;
  insert into public.rate_hits (bucket) values (p_bucket);
  return true;
end;
$$;
revoke execute on function public.rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_hit(text, integer, integer) to service_role;

-- 2. One live chat per name (case-insensitive), so two visitors never look the same in the bot.
--    Older duplicates get their short id appended first.
update public.chat_sessions s
set name = left(s.name, 26) || ' #' || left(s.id::text, 4)
where exists (
  select 1 from public.chat_sessions newer
  where lower(newer.name) = lower(s.name) and newer.created_at > s.created_at
);
create unique index chat_sessions_name_unique on public.chat_sessions (lower(name));
