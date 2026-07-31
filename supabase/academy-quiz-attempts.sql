-- AI quiz attempts + retake unlock via quiz_assignments.consumed_at

alter table public.quiz_assignments
  add column if not exists consumed_at timestamptz;

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  assignment_id uuid references public.quiz_assignments(id) on delete set null,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb,
  score int,
  passed boolean,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted')),
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists quiz_attempts_student_module_idx
  on public.quiz_attempts (student_id, module_id, created_at desc);

create index if not exists quiz_attempts_status_idx
  on public.quiz_attempts (student_id, module_id, status);

alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own"
  on public.quiz_attempts for select
  to authenticated
  using (student_id = auth.uid());

-- Writes go through service role from API routes.
