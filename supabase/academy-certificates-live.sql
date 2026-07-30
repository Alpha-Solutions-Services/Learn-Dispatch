-- Certificate integrity + live sessions (also applied via Supabase MCP)
alter table public.academy_certificates
  add column if not exists integrity_hash text;

create index if not exists academy_certificates_no_idx
  on public.academy_certificates (certificate_no);

create table if not exists public.academy_live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  duration_minutes int not null default 60,
  join_url text not null,
  provider text not null default 'jitsi',
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_live_sessions_starts_idx
  on public.academy_live_sessions (starts_at desc);

alter table public.academy_live_sessions enable row level security;
