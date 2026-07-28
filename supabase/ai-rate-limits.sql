-- Persistent AI chat rate limits (replaces in-memory Map on serverless)
-- Run in Supabase SQL Editor.

create table if not exists public.ai_rate_limits (
  user_id text primary key,
  count int not null default 0,
  reset_at timestamptz not null default now()
);

-- Service role only; no client access
alter table public.ai_rate_limits enable row level security;

comment on table public.ai_rate_limits is
  'Per-user AI chat rate windows; written via service role only.';
