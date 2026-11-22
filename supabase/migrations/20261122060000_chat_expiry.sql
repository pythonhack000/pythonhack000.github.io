-- Site chat history lives for one day: every hour, messages older than 24 h go,
-- and chats with no message for 24 h are removed with everything in them.
create extension if not exists pg_cron with schema pg_catalog;

create function public.expire_chat()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.chat_messages where created_at < now() - interval '24 hours';
  delete from public.chat_sessions where coalesce(last_message_at, created_at) < now() - interval '24 hours';
  delete from public.rate_hits where at < now() - interval '24 hours';
$$;
revoke execute on function public.expire_chat() from public, anon, authenticated;

select cron.schedule('expire-chat', '7 * * * *', 'select public.expire_chat()');
