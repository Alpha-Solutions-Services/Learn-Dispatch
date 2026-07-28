-- Fix auth user deletes blocked by profiles / dispatch_load_approvals FKs.
-- Safe to re-run. Optional if the portal DELETE API already cleans profiles first.

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
    AND (
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = 'public.profiles'::regclass AND a.attnum = conkey[1]
    ) = 'id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.dispatch_load_approvals'::regclass
      AND c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.dispatch_load_approvals DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.dispatch_load_approvals
  ALTER COLUMN requested_by DROP NOT NULL;

ALTER TABLE public.dispatch_load_approvals
  ADD CONSTRAINT dispatch_load_approvals_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.dispatch_load_approvals
  ADD CONSTRAINT dispatch_load_approvals_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users (id) ON DELETE SET NULL;
