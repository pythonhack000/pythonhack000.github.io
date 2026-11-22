-- Live chat on the site: a visitor talks under a name, Bekha answers from Telegram by replying.
-- RLS on, no policies: only the Edge Functions (service role) read or write.

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 32),
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  from_owner boolean not null default false,
  body text not null check (char_length(body) between 1 and 1000),
  tg_message_id bigint,
  created_at timestamptz not null default now()
);
create index chat_messages_session_id on public.chat_messages (session_id, id);
create unique index chat_messages_tg on public.chat_messages (tg_message_id) where tg_message_id is not null;

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
