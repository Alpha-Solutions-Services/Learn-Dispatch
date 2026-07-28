-- Staff action audit trail
-- Run in Supabase SQL Editor.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb
);

create index if not exists audit_events_created_idx
  on public.audit_events (created_at desc);

alter table public.audit_events enable row level security;
-- Service role only for inserts/selects from admin APIs

comment on table public.audit_events is
  'Immutable-ish audit log of staff/sensitive portal actions.';
