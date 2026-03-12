-- =====================================================
-- API Keys table for programmatic access to CloudHub
-- =====================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  key_prefix text not null check (char_length(key_prefix) = 12),
  key_hash text not null,
  scopes text[] not null default '{}' check (array_length(scopes, 1) >= 1),
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Unique index on key_hash for fast auth lookups
create unique index idx_api_keys_key_hash on public.api_keys (key_hash);

-- Index on user_id for listing a user's keys
create index idx_api_keys_user_id on public.api_keys (user_id);

-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.api_keys enable row level security;

-- Users can read only their own keys
create policy "Users can view own api keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

-- Users can create keys for themselves
create policy "Users can create own api keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

-- Users can update (revoke) only their own keys
create policy "Users can update own api keys"
  on public.api_keys for update
  using (auth.uid() = user_id);

-- No delete policy — keys are revoked, never removed
