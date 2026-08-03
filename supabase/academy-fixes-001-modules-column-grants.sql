-- Bug 1: academy_modules paid content leaked via PostgREST.
-- Live policy academy_modules_read_published allowed SELECT of full rows
-- (including content_md, video_url) to anon/authenticated whenever
-- is_published = true. App BFF already uses service_role + isPaidAccessActive;
-- this closes the direct REST bypass.
--
-- Postgres RLS is row-level only. Column-level GRANT is required so
-- anon/authenticated can list catalog fields but cannot read lesson body.
-- Staff/admin module CRUD in Learn Dispatch goes through getServiceRoleClient()
-- (academy-db.ts), so service_role retains full column access.
--
-- Additive. Do not apply until approved.

-- ─── Tighten row policy (published catalog only for anon/authenticated) ─────
DROP POLICY IF EXISTS academy_modules_read_published ON public.academy_modules;

CREATE POLICY academy_modules_read_published
  ON public.academy_modules
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Keep dispatcher ALL policy as-is (academy_modules_dispatcher_all).
-- Instructors who hit the table with a user JWT still only get catalog
-- columns below; full content remains service-role BFF (current app path).

-- ─── Column grants: catalog yes, paid body no ───────────────────────────────
REVOKE SELECT ON TABLE public.academy_modules FROM anon, authenticated;

GRANT SELECT (
  id,
  created_at,
  updated_at,
  sort_order,
  title,
  summary,
  is_published,
  duration_minutes
) ON public.academy_modules TO anon, authenticated;

-- Explicitly do NOT grant: content_md, video_url, video_provider
-- service_role / table owner retain full privileges.
