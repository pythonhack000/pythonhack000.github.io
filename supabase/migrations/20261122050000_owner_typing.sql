-- "bekha is typing": set when Bekha taps Reply for a visitor, cleared when his answer arrives.
alter table public.chat_sessions add column owner_typing_at timestamptz;
