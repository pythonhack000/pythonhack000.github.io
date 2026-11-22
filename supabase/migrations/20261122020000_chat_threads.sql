-- One Telegram topic per visitor, an "awaiting reply" flag and the last activity for /chats.
alter table public.chat_sessions
  add column tg_thread_id bigint,
  add column awaiting boolean not null default false,
  add column last_message_at timestamptz;
create unique index chat_sessions_thread on public.chat_sessions (tg_thread_id) where tg_thread_id is not null;
create index chat_sessions_last on public.chat_sessions (last_message_at desc nulls last);
