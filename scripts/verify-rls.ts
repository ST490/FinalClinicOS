// Verify RLS is ENABLED + FORCED on every tenant table in the
// Careme Clinic OS database. Pure read-only check — does NOT apply the
// migration (that is done by `prisma migrate deploy`, which runs the SQL in
// prisma/migrations/20260718000000_rls_tenant_isolation/migration.sql).
//
//   DIRECT_URL=... npx tsx scripts/verify-rls.ts
//
// The migration + role creation are the manual Supabase/AWS steps:
//   scripts/setup-roles.sql  (creates careme_app / careme_bypass)
//   prisma migrate deploy    (applies the RLS policies below)
// For RLS to ENFORCE, the app must connect as the NON-superuser
// careme_app role — superusers (incl. the postgres role) bypass RLS.
import { Client } from 'pg';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) { console.error('Set DIRECT_URL to verify RLS.'); process.exit(1); }

const tables = [
  'patients','patient_visits','appointments','inventory_items','stock_movements',
  'prescriptions','prescription_items','dues','reminders','staff_attendance',
  'staff_schedules','leave_requests','payroll',
  'audit_logs','invites','api_keys','staff_credentials',
];

const client = new Client({ connectionString: url });
await client.connect();
let ok = true;
try {
  for (const t of tables) {
    const r = await client.query(
      "SELECT relrowsecurity AS rls, relforcerowsecurity AS force FROM pg_class WHERE relname = $1 AND relkind = 'r'",
      [t],
    );
    if (r.rows.length === 0) continue; // not present (e.g. staff_credentials)
    const enforced = r.rows[0].rls === true;
    const forced = r.rows[0].force === true;
    console.log(`${enforced && forced ? 'OK ' : 'MISSING'}  ${t} RLS=${enforced} FORCE=${forced}`);
    if (!enforced || !forced) ok = false;
  }
} catch (e: any) {
  console.error('VERIFY ERROR:', e.message);
  ok = false;
} finally {
  await client.end();
}
console.log(ok ? '\nRLS enforced + forced on all present tenant tables.' : '\nRLS not fully applied — see above.');
process.exit(ok ? 0 : 1);
