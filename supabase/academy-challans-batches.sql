-- Learn Dispatch: WhatsApp, monthly batches, fee challans
alter table public.profiles
  add column if not exists whatsapp_phone text,
  add column if not exists batch_code text;

create table if not exists public.academy_batches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  starts_on date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fee_challans (
  id uuid primary key default gen_random_uuid(),
  challan_no text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  batch_code text,
  plan text not null,
  amount_pkr integer not null,
  currency text not null default 'PKR',
  status text not null default 'unpaid'
    check (status in ('unpaid', 'pending', 'paid', 'expired', 'refunded')),
  student_name text not null,
  student_email text not null,
  whatsapp_phone text,
  nayapay_account text,
  nayapay_iban text,
  payment_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  verified_by uuid references auth.users(id),
  verified_at timestamptz
);

create index if not exists fee_challans_student_idx on public.fee_challans (student_id, created_at desc);
create index if not exists fee_challans_status_idx on public.fee_challans (status);

alter table public.fee_challans enable row level security;
alter table public.academy_batches enable row level security;

drop policy if exists "students_view_own_challans" on public.fee_challans;
create policy "students_view_own_challans"
  on public.fee_challans for select
  using (auth.uid() = student_id);

drop policy if exists "academy_staff_all_challans" on public.fee_challans;
create policy "academy_staff_all_challans"
  on public.fee_challans for all
  using (public.is_academy_staff())
  with check (public.is_academy_staff());

drop policy if exists "authenticated_read_batches" on public.academy_batches;
create policy "authenticated_read_batches"
  on public.academy_batches for select
  using (auth.role() = 'authenticated');

drop policy if exists "academy_staff_manage_batches" on public.academy_batches;
create policy "academy_staff_manage_batches"
  on public.academy_batches for all
  using (public.is_academy_staff())
  with check (public.is_academy_staff());

-- Seed current month batch if missing
insert into public.academy_batches (code, label, starts_on)
select
  'LD-' || to_char(now() at time zone 'utc', 'YYYY-MM'),
  'Batch ' || to_char(now() at time zone 'utc', 'Mon YYYY'),
  date_trunc('month', now() at time zone 'utc')::date
where not exists (
  select 1 from public.academy_batches
  where code = 'LD-' || to_char(now() at time zone 'utc', 'YYYY-MM')
);
