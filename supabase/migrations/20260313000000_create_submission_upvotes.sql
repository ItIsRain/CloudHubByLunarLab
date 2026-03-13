-- =====================================================
-- Submission Upvotes — tracks who upvoted which submission
-- =====================================================

create table if not exists public.submission_upvotes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- One upvote per user per submission
  unique (submission_id, user_id)
);

-- Fast lookups: "did this user upvote this submission?"
create index idx_submission_upvotes_user on public.submission_upvotes (user_id, submission_id);

-- Fast count: "how many upvotes does this submission have?"
create index idx_submission_upvotes_submission on public.submission_upvotes (submission_id);

-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.submission_upvotes enable row level security;

-- Anyone can read upvotes (public vote counts)
create policy "Anyone can view upvotes"
  on public.submission_upvotes for select
  using (true);

-- Authenticated users can insert their own upvotes
create policy "Users can create own upvotes"
  on public.submission_upvotes for insert
  with check (auth.uid() = user_id);

-- Users can remove their own upvotes
create policy "Users can delete own upvotes"
  on public.submission_upvotes for delete
  using (auth.uid() = user_id);
