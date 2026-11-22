-- Who Bekha is talking to in the bot right now: after tapping "Reply" every plain message goes there.
create table public.bot_state (
  id smallint primary key default 1 check (id = 1),
  active_session uuid references public.chat_sessions (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.bot_state (id) values (1);
alter table public.bot_state enable row level security;
