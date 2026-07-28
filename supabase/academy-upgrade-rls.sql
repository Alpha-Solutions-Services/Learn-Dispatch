-- ============================================================
-- Learn Dispatch Academy — Upgrade Migration (Option A)
-- Rewritten for THIS project: enrollment lives on `profiles`,
-- progress on `academy_modules` / `academy_progress`.
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Staff helper (matches existing is_dispatcher() pattern)
-- ------------------------------------------------------------
create or replace function public.is_academy_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('instructor', 'dispatcher', 'admin')
  );
$$;

-- ------------------------------------------------------------
-- 1. PROFILES: payment method + auto-expiry support
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists payment_method text,
  add column if not exists paid_until timestamptz,
  add column if not exists payment_reference text;

-- Constrain payment_method when set (nullable for non-students / legacy rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_payment_method_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_payment_method_check
      check (
        payment_method is null
        or payment_method in ('naya_pay', 'stripe', 'paypal')
      );
  end if;
end $$;

-- Allow expired status
alter table public.profiles drop constraint if exists profiles_enrollment_status_check;
alter table public.profiles
  add constraint profiles_enrollment_status_check
  check (
    enrollment_status is null
    or enrollment_status in ('unpaid', 'pending', 'paid', 'refunded', 'expired')
  );

-- Default NayaPay for academy students that already enrolled
update public.profiles
set payment_method = 'naya_pay'
where role = 'student'
  and payment_method is null
  and enrollment_status is not null;

-- Auto-set paid_until when enrollment flips to paid
create or replace function public.set_profile_paid_until()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.enrollment_status = 'paid'
     and (old.enrollment_status is distinct from 'paid') then
    if new.payment_confirmed_at is null then
      new.payment_confirmed_at := now();
    end if;
    if new.enrollment_plan = 'lifetime' then
      new.paid_until := now() + interval '2 months';
    else
      -- monthly (and any unknown plan): 1 month
      new.paid_until := now() + interval '1 month';
    end if;
    if new.payment_method is null then
      new.payment_method := 'naya_pay';
    end if;
  end if;

  -- Clear expiry window when access is revoked / reset
  if new.enrollment_status in ('unpaid', 'pending', 'refunded', 'expired')
     and old.enrollment_status is distinct from new.enrollment_status then
    if new.enrollment_status <> 'expired' then
      new.paid_until := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_profile_paid_until on public.profiles;
create trigger trg_set_profile_paid_until
  before update on public.profiles
  for each row
  execute function public.set_profile_paid_until();

-- Backfill paid_until BEFORE the protect trigger exists (migrations run as DB role, not JWT).
update public.profiles
set paid_until =
  coalesce(payment_confirmed_at, enrolled_at, now())
  + case
      when enrollment_plan = 'lifetime' then interval '2 months'
      else interval '1 month'
    end
where role = 'student'
  and enrollment_status = 'paid'
  and paid_until is null;

-- Block students (and other non-staff) from self-promoting to paid / editing billing fields.
-- Service role / SQL editor often have no auth.uid(); PostgREST service_role sets auth.role().
create or replace function public.protect_profile_enrollment_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.enrollment_status is not distinct from old.enrollment_status
     and new.enrollment_plan is not distinct from old.enrollment_plan
     and new.paid_until is not distinct from old.paid_until
     and new.payment_method is not distinct from old.payment_method
     and new.payment_reference is not distinct from old.payment_reference
     and new.payment_confirmed_at is not distinct from old.payment_confirmed_at
     and new.payment_confirmed_by is not distinct from old.payment_confirmed_by
     and new.payment_notes is not distinct from old.payment_notes
     and new.role is not distinct from old.role
     and new.enrolled_at is not distinct from old.enrolled_at then
    return new;
  end if;

  if public.is_academy_staff() or public.is_dispatcher() then
    return new;
  end if;

  raise exception 'Not allowed to modify enrollment or role fields'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_protect_profile_enrollment on public.profiles;
create trigger trg_protect_profile_enrollment
  before update on public.profiles
  for each row
  execute function public.protect_profile_enrollment_columns();

-- Staff can read student profiles (enrollments UI uses service role; this helps Table Editor / future client reads)
drop policy if exists "academy_staff_select_students" on public.profiles;
create policy "academy_staff_select_students"
  on public.profiles for select
  using (
    public.is_academy_staff()
    and role = 'student'
  );

drop policy if exists "academy_staff_update_students" on public.profiles;
create policy "academy_staff_update_students"
  on public.profiles for update
  using (
    public.is_academy_staff()
    and role = 'student'
  )
  with check (
    role = 'student'
  );

-- ------------------------------------------------------------
-- 2. ACADEMY MODULES: video metadata
-- ------------------------------------------------------------
alter table public.academy_modules
  add column if not exists video_url text,
  add column if not exists video_provider text default 'r2',
  add column if not exists duration_minutes int;

-- Keep existing is_published policies; ensure RLS is on
alter table public.academy_modules enable row level security;

-- ------------------------------------------------------------
-- 3. ACADEMY PROGRESS: quiz fields (do NOT create module_progress)
-- ------------------------------------------------------------
alter table public.academy_progress
  add column if not exists quiz_score int,
  add column if not exists completed_at timestamptz;

alter table public.academy_progress enable row level security;

-- ------------------------------------------------------------
-- 4. QUIZ QUESTIONS
-- ------------------------------------------------------------
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quiz_questions_module_order_idx
  on public.quiz_questions (module_id, order_index);

alter table public.quiz_questions enable row level security;

-- No direct student SELECT (hides correct_index). App loads questions via service role.
drop policy if exists "authenticated_read_quiz_questions" on public.quiz_questions;
drop policy if exists "instructors_manage_quiz_questions" on public.quiz_questions;
drop policy if exists "academy_staff_manage_quiz_questions" on public.quiz_questions;
create policy "academy_staff_manage_quiz_questions"
  on public.quiz_questions for all
  using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- ------------------------------------------------------------
-- 5. PAYMENT AUDIT LOG (keyed by student profile, not enrollments)
-- ------------------------------------------------------------
create table if not exists public.payment_audit_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  actor_id uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payment_audit_log_student_created_idx
  on public.payment_audit_log (student_id, created_at desc);

alter table public.payment_audit_log enable row level security;

drop policy if exists "instructors_view_audit_log" on public.payment_audit_log;
drop policy if exists "instructors_insert_audit_log" on public.payment_audit_log;
drop policy if exists "academy_staff_select_audit_log" on public.payment_audit_log;
drop policy if exists "academy_staff_insert_audit_log" on public.payment_audit_log;

create policy "academy_staff_select_audit_log"
  on public.payment_audit_log for select
  using (public.is_academy_staff());

create policy "academy_staff_insert_audit_log"
  on public.payment_audit_log for insert
  with check (public.is_academy_staff());

-- Students may see their own audit trail (optional transparency)
drop policy if exists "students_view_own_audit_log" on public.payment_audit_log;
create policy "students_view_own_audit_log"
  on public.payment_audit_log for select
  using (auth.uid() = student_id);

-- ============================================================
-- VERIFY (run separately as a student JWT / Table Editor):
--   select * from profiles where id <> auth.uid();  -- expect 0 student leaks
--   select * from quiz_questions;                   -- expect deny for students
--   select * from loads;                            -- expect deny / empty (TMS)
-- ============================================================
