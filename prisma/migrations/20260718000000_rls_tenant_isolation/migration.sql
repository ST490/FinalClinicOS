-- ─────────────────────────────────────────────────────────────────────────────
-- RLS TENANT ISOLATION (Careme blueprint §14)
--
-- Enforces multi-tenant isolation at the PostgreSQL layer so a missing
-- app-level clinicId/orgId filter can never leak another clinic's data.
--
-- Session contract (set per request by src/config/tenant-session.ts):
--   app.current_org_id   TEXT  — caller's org
--   app.current_clinics  TEXT  — csv of clinic ids the caller may see ('' = org owner, all)
--   app.is_org_owner     TEXT  — 'true' for org owners (see all clinics in their org)
--
-- Roles (created separately, manually) live in scripts/setup-roles.sql:
--   careme_app   — the APPLICATION role. NOSUPERUSER so Postgres Row-Level
--                   Security actually ENFORCES (superusers bypass RLS). Point
--                   DATABASE_URL / DIRECT_URL at this role, NOT the superuser
--                   `postgres` (which would bypass RLS entirely).
--   careme_bypass — for migrations, seed, and background jobs (reminder
--                   processor). BYPASSRLS exempts it from policies.
--
-- Applied automatically by `prisma migrate deploy`. Idempotent: uses
-- DROP POLICY IF EXISTS + CREATE POLICY so re-running is safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Non-null clinic_id tenant tables.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients','patient_visits','appointments','inventory_items','stock_movements',
    'prescriptions','prescription_items','dues','reminders','staff_attendance',
    'staff_schedules','leave_requests','payroll'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON TABLE %I TO careme_app, careme_bypass;', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I;
       CREATE POLICY tenant_isolation ON %I FOR ALL
       USING (
         org_id = current_setting(''app.current_org_id'', true)::text
         AND (
           current_setting(''app.is_org_owner'', true) = ''true''
           OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')::text[])
         )
       );', t, t);
  END LOOP;
END $$;

-- 2. Nullable clinic_id tenant tables (audit_logs, invites, api_keys).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_logs','invites','api_keys']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT ALL ON TABLE %I TO careme_app, careme_bypass;', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I;
       CREATE POLICY tenant_isolation ON %I FOR ALL
       USING (
         org_id = current_setting(''app.current_org_id'', true)::text
         AND (
           current_setting(''app.is_org_owner'', true) = ''true''
           OR clinic_id IS NULL
           OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')::text[])
         )
       );', t, t);
  END LOOP;
END $$;

-- 3. staff_credentials — only if the table exists (created by a later migration).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_credentials') THEN
    ALTER TABLE staff_credentials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE staff_credentials FORCE ROW LEVEL SECURITY;
    GRANT ALL ON TABLE staff_credentials TO careme_app, careme_bypass;
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation ON staff_credentials;
       CREATE POLICY tenant_isolation ON staff_credentials FOR ALL
       USING (
         org_id = current_setting(''app.current_org_id'', true)::text
         AND (
           current_setting(''app.is_org_owner'', true) = ''true''
           OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')::text[])
         )
       );';
  END IF;
END $$;

-- 4. Global / boundary tables intentionally EXCLUDED from RLS:
--    organizations, clinics, users, user_clinic_roles, medicines_master,
--    refresh_tokens — these define the tenant boundary or are global catalogs.
