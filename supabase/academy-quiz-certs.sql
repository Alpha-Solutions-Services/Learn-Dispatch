-- Quiz assignments + certificates
create table if not exists public.quiz_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.academy_modules(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  note text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, module_id)
);

create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_no text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text not null,
  student_email text not null,
  batch_code text,
  issued_by uuid references auth.users(id),
  issued_at timestamptz not null default now(),
  modules_completed int not null default 0,
  note text
);
