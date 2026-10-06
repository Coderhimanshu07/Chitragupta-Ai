-- ============================================================
-- चित्रGupt AI - Supabase schema
-- Run this once in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chats_touch_updated_at on public.chats;
create trigger chats_touch_updated_at
  before update on public.chats
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Row Level Security: a user can only ever touch their own chats.
-- The server passes the caller's JWT through, so RLS is the
-- real permission boundary - never trust a user_id from the body.
-- ============================================================

alter table public.chats enable row level security;

drop policy if exists "chats are private per user" on public.chats;
create policy "chats are private per user"
  on public.chats
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);