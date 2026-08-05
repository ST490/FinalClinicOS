-- ─────────────────────────────────────────────────────────────────────────────
-- RLS TENANT ISOLATION (Careme Clinic OS)
--
-- Enforces multi-tenant isolation at the PostgreSQL layer so a missing
-- app-level clinicId/orgId filter can never leak another clinic's data.
--
-- Session contract (set per request by src/config/tenant-session.ts):
--   app.current_org_id    TEXT  — caller's org
--   app.current_user_id   TEXT  — caller's user id (for user_clinic_roles bootstrap)
--   app.current_clinics   TEXT  — csv of clinic ids the caller may see
--   app.is_org_owner      TEXT  — 'true' for org owners (see all clinics in their org)
--
-- Roles (created separately via scripts/setup-roles.sql):
--   careme_app    — NOSUPERUSER NOBYPASSRLS (RLS enforced)
--   careme_bypass — BYPASSRLS (migrations, seed, workers)
--
-- Idempotent: uses DROP POLICY IF EXISTS + CREATE POLICY.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tables with both org_id + clinic_id (NOT NULL): 14 tables
DO $$
DECLARE
  t text;
  both_keys text[] := ARRAY[
    'staff_credentials','patients','patient_visits','appointments','inventory_items',
    'stock_movements','prescriptions','prescription_items','dues','reminders',
    'staff_attendance','payroll','leave_requests','staff_schedules'];
BEGIN
  FOREACH t IN ARRAY both_keys LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL
      USING (
        org_id = current_setting('app.current_org_id', true)
        AND ( current_setting('app.is_org_owner', true) = 'true'
              OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ',')) )
      )
      WITH CHECK (
        org_id = current_setting('app.current_org_id', true)
        AND ( current_setting('app.is_org_owner', true) = 'true'
              OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ',')) )
      );$f$, t);
  END LOOP;
END $$;

-- 2. user_clinic_roles (clinic_id only, no org_id — bootstrap-aware)
DO $$
DECLARE
  t text;
  clinic_only text[] := ARRAY['user_clinic_roles'];
BEGIN
  FOREACH t IN ARRAY clinic_only LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL
      USING (
        user_id = current_setting('app.current_user_id', true)
        OR current_setting('app.is_org_owner', true) = 'true'
           AND clinic_id IN (SELECT id FROM clinics WHERE org_id = current_setting('app.current_org_id', true))
        OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ','))
      )
      WITH CHECK (
        current_setting('app.is_org_owner', true) = 'true'
           AND clinic_id IN (SELECT id FROM clinics WHERE org_id = current_setting('app.current_org_id', true))
        OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ','))
      );$f$, t);
  END LOOP;
END $$;

-- 3. Nullable clinic_id tables (org-scoped, clinic optional)
DO $$
DECLARE
  t text;
  nullable_clinic text[] := ARRAY['audit_logs','invites','api_keys'];
BEGIN
  FOREACH t IN ARRAY nullable_clinic LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL
      USING (
        org_id = current_setting('app.current_org_id', true)
        AND ( current_setting('app.is_org_owner', true) = 'true'
              OR clinic_id IS NULL
              OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ',')) )
      )
      WITH CHECK (
        org_id = current_setting('app.current_org_id', true)
        AND ( current_setting('app.is_org_owner', true) = 'true'
              OR clinic_id IS NULL
              OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ',')) )
      );$f$, t);
  END LOOP;
END $$;

-- 4. GRANTs so careme_app can SELECT/INSERT/UPDATE/DELETE
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'staff_credentials','patients','patient_visits','appointments','inventory_items',
    'stock_movements','prescriptions','prescription_items','dues','reminders',
    'staff_attendance','payroll','leave_requests','staff_schedules',
    'user_clinic_roles','audit_logs','invites','api_keys'];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON %I TO careme_app, careme_bypass', t);
  END LOOP;
END $$;

-- 5. EXEMPT tables (NO RLS): organizations, clinics, users, refresh_tokens,
--    medicines_master. These define the tenant boundary or are global catalogs.
