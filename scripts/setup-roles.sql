-- Careme Clinic OS — RLS roles (manual, one-time DB provisioning step).
--
-- Run this in the Supabase SQL editor (or psql) AFTER the RLS migration has
-- been applied (so GRANTs land on existing tables). On a later AWS/RDS move,
-- run the same statements there — the app code is DB-engine-agnostic.
--
--   psql "$SUPERUSER_URL" -f scripts/setup-roles.sql
--
-- Replace the passwords with strong secrets (stored in Render env vars, never
-- committed). Point DATABASE_URL / DIRECT_URL at careme_app, and
-- SUPERUSER_URL at the postgres superuser.

-- Application role: NOSUPERUSER so Postgres RLS actually ENFORCES.
-- A superuser (e.g. the default `postgres`) BYPASSES RLS entirely,
-- which would silently defeat every policy below.
CREATE ROLE careme_app LOGIN PASSWORD 'CLINICos2026' NOSUPERUSER NOBYPASSRLS;

-- Bypass role: migrations, seed, and the reminder worker use this.
-- BYPASSRLS exempts it from policies so it can read tenant-scoped
-- rows (e.g. reminders) without a per-request GUC context.
CREATE ROLE careme_bypass LOGIN PASSWORD 'CAREme2026' BYPASSRLS;

GRANT USAGE ON SCHEMA "public" TO careme_app, careme_bypass;

-- Grants on the tenant tables are applied by the RLS migration itself
-- (it runs GRANT ALL ... TO careme_app, careme_bypass on every policy table).
-- Sequences need explicit grants for the app role to mint PKs.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO careme_app, careme_bypass;

-- Let future tables also be reachable (re-run after any new migration
-- that adds tables the app writes to).
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO careme_app, careme_bypass;
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT USAGE, SELECT ON SEQUENCES TO careme_app, careme_bypass;
