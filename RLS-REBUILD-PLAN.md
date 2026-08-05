# RLS Tenant Isolation — Rebuild From Zero (Exhaustive Plan)

> Context: We hard-reset the repo to `92a3426` and dropped ALL DB-side RLS
> (17 policies, FORCE/ENABLE, and the `careme_app`/`careme_bypass` roles) so
> both code and DB are at a true zero. This plan rebuilds tenant isolation at
> the **database layer** (PostgreSQL RLS) on top of the *existing* partial
> harness (`src/config/tenant-session.ts` already exists at 92a3426 but is
> only wired into 3/17 routers and has a latent GUC-scope bug).

---

## 0. GROUND TRUTH (verified by exploration agents at 92a3426)

### 0.1 Connection code — `src/config/database.ts` (CURRENT STATE, must change)
- Singleton: `const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;`
- Prisma Client v7.8.0 with `@prisma/adapter-pg` driver adapter using `pg.Pool`.
- NO exported `Tx` type.
- `transactionOptions: { timeout: 10000, maxWait: 5000 }` already set (good — interactive tx supported).

### 0.2 Tenant-session harness — `src/config/tenant-session.ts` (ALREADY EXISTS)
```ts
export interface TenantContext { orgId: string; clinics: string[]; isOrgOwner: boolean; }
export function tenantContextFromReq(req) {
  const u = req.user; if (!u) throw ...;
  const clinics = (u.roles||[]).map(r=>r.clinicId).filter(Boolean);
  return { orgId: u.orgId, clinics, isOrgOwner: u.isOrgOwner };
}
export async function withTenant<T>(req, fn) {
  const { orgId, clinics, isOrgOwner } = tenantContextFromReq(req);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id',$1,true),
              set_config('app.current_clinics',$2,true),
              set_config('app.is_org_owner',$3,true)`,
      orgId, clinics.join(','), isOrgOwner?'true':'false');
    return fn(tx);
  });
}
```
**LATENT BUG:** `fn(tx)` receives `tx` but the 3 routers that call it do NOT pass `tx`
into the service, so the service's `prisma.` queries run on a SEPARATE connection
without the GUCs. The GUCs are set and then discarded. Fix = thread `tx` into services.

### 0.3 Auth — `src/auth/middleware/auth.middleware.ts`
- `authenticate()` sets `req.user.roles[*].clinicId = ''` (EMPTY) — line 40.
- `loadUserRoles()` (line 154) re-queries DB and fills real `clinicId`/`clinicName`.
- `withTenant` MUST run after `loadUserRoles` or `clinics` is `[]` → over-restrictive.
- JWT carries `orgId`, `activeClinicId`, `roles`, `isOrgOwner` — NOT a clinic list.
- `AuthService` uses its OWN `new PrismaClient()` (line 12) — must stay RLS-EXEMPT.

### 0.4 Models (29 total) — tenant key columns (ALL snake_case, consistent)
- **Both `org_id` + `clinic_id` (NOT NULL):** staff_credentials, patients, patient_visits,
  appointments, inventory_items, stock_movements, prescriptions, dues, reminders,
  staff_attendance, payroll, leave_requests, staff_schedules  → **13 tables**
- **Only `clinic_id` (no org_id):** user_clinic_roles  → **1 table** (derive org via Clinic FK)
- **`org_id` + nullable `clinic_id`:** audit_logs, invites, api_keys  → **3 tables**
- **No tenant keys (RLS-EXEMPT / boundary):** organizations, clinics, users,
  refresh_tokens, medicines_master  → **5 tables** (users/clinics/orgs are the tenancy ROOT;
  RLS policies on them would break bootstrap — they are reached via the GUC set by the
  calling request but NOT filtered by clinic/org policy)
- **⚠️ BLOCKING GAP:** `prescription_items` has NEITHER `org_id` NOR `clinic_id`.
  Only FK → prescriptions(id). MUST add both columns + backfill before RLS can target it.

### 0.5 Routers already calling `withTenant` (partial): credentials, audit, appointments.
### 0.6 Routers NOT wired (rely on app-level filters only): patients, inventory,
###     billing, staff, visits, attendance, payroll, leave, org, prescriptions,
###     reminders, reports, medicines.

---

## 1. PHASE 0 — SCHEMA FIX (the prescription_items gap)

**File: `prisma/schema.prisma`**
In the `PrescriptionItem` model, add two fields (match every other tenant table):
```prisma
model PrescriptionItem {
  // ... existing fields ...
  orgId    String   @map("org_id")
  clinicId String   @map("clinic_id")
  @@index([org_id, clinic_id])
}
```
The `prescription_id` FK to `prescription` is the backfill source.

**Migration 1:** `prisma/migrations/00010_prescription_items_tenant_columns/migration.sql`
```sql
ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS clinic_id text;

-- Clean up orphaned prescription items that do not have a parent prescription
DELETE FROM prescription_items
WHERE prescription_id NOT IN (SELECT id FROM prescriptions);

UPDATE prescription_items pi
SET org_id = p.org_id, clinic_id = p.clinic_id
FROM prescriptions p
WHERE pi.prescription_id = p.id
  AND (pi.org_id IS NULL OR pi.clinic_id IS NULL);

ALTER TABLE prescription_items
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN clinic_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS prescription_items_org_clinic_idx
  ON prescription_items (org_id, clinic_id);
```
Rationale: backfilling from the parent `prescriptions` row guarantees the child
carries the same tenant scope. After this, all 17 target tables have the keys.

---

## 2. PHASE 1 — DB ROLES (one-time manual step, NOT in migration)

**File (new): `scripts/setup-roles.sql`** — run ONCE on the live DB after migrations.
```sql
-- App role: NOSUPERUSER + NOBYPASSRLS so RLS ACTUALLY ENFORCES.
CREATE ROLE careme_app LOGIN PASSWORD 'CLINICos2026'
  NOSUPERUSER NOBYPASSRLS;

-- Bypass role: migrations, seed, reminder worker (BYPASSRLS so it reads
-- tenant tables without a per-request GUC context).
CREATE ROLE careme_bypass LOGIN PASSWORD 'CAREme2026' BYPASSRLS;

GRANT USAGE ON SCHEMA public TO careme_app, careme_bypass;

-- Grants on tenant tables (the RLS migration below also grants, but explicit
-- here for sequences so the app can mint PKs).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO careme_app, careme_bypass;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO careme_app, careme_bypass;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO careme_app, careme_bypass;
```
**Why manual:** roles + passwords must not live in committed migrations; the
superuser/pooler distinction means migration DDL runs as `postgres`, not `careme_app`.

---

## 3. PHASE 2 — RLS POLICY MIGRATION (the core)

**Migration 2:** `prisma/migrations/00011_rls_tenant_isolation/migration.sql`

Design: ENABLE + FORCE RLS on all 17 tenant tables; one `tenant_isolation`
policy (USING + WITH CHECK) per table keyed on the session GUCs:
- `app.current_org_id` (text)
- `app.current_clinics` (csv of clinic ids)
- `app.is_org_owner` (text 'true'/'false')

Policy predicate (handles nullable clinic_id + org-owner):
```sql
-- For tables WITH both keys (13 tables):
( org_id = current_setting('app.current_org_id', true)::text )
AND
( current_setting('app.is_org_owner', true) = 'true'
  OR clinic_id = ANY (string_to_array(current_setting('app.current_clinics', true), ',')) )
```
For `user_clinic_roles` (clinic_id only, no org_id): predicate is just the clinic list
part (derive org from the join if needed; for the policy, filter by `clinic_id = ANY(...)`).
For `audit_logs`/`invites`/`api_keys` (nullable clinic_id): use
`clinic_id IS NULL OR clinic_id = ANY(...)` so org-level rows are visible to org owners.

The migration uses a DO block to loop over the table list so it's DRY + idempotent:
```sql
DO $$
DECLARE
  t text;
  both_keys text[] := ARRAY[
    'staff_credentials','patients','patient_visits','appointments','inventory_items',
    'stock_movements','prescriptions','dues','reminders','staff_attendance','payroll',
    'leave_requests','staff_schedules','prescription_items'];
  clinic_only text[] := ARRAY['user_clinic_roles'];
  nullable_clinic text[] := ARRAY['audit_logs','invites','api_keys'];
BEGIN
  -- 13 both-key tables
  FOREACH t IN ARRAY both_keys LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL
      TO careme_app, careme_bypass
      USING (
        org_id = current_setting(''app.current_org_id'', true)
        AND ( current_setting(''app.is_org_owner'', true) = ''true''
              OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')) )
      )
      WITH CHECK (
        org_id = current_setting(''app.current_org_id'', true)
        AND ( current_setting(''app.is_org_owner'', true) = ''true''
              OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')) )
      );$f$, t);
  END LOOP;

  -- user_clinic_roles (clinic only, bootstrap-aware via current_user_id & org owner aware)
  FOREACH t IN ARRAY clinic_only LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO careme_app, careme_bypass
      USING (
        user_id = current_setting(''app.current_user_id'', true)
        OR current_setting(''app.is_org_owner'', true) = ''true'' AND clinic_id IN (SELECT id FROM clinics WHERE org_id = current_setting(''app.current_org_id'', true))
        OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '',''))
      )
      WITH CHECK (
        current_setting(''app.is_org_owner'', true) = ''true'' AND clinic_id IN (SELECT id FROM clinics WHERE org_id = current_setting(''app.current_org_id'', true))
        OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '',''))
      );$f$, t);
  END LOOP;

  -- nullable clinic (org-scoped, clinic optional)
  FOREACH t IN ARRAY nullable_clinic LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      FOR ALL TO careme_app, careme_bypass
      USING (
        org_id = current_setting(''app.current_org_id'', true)
        AND ( current_setting(''app.is_org_owner'', true) = ''true''
              OR clinic_id IS NULL
              OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')) )
      )
      WITH CHECK (
        org_id = current_setting(''app.current_org_id'', true)
        AND ( current_setting(''app.is_org_owner'', true) = ''true''
              OR clinic_id IS NULL
              OR clinic_id = ANY (string_to_array(current_setting(''app.current_clinics'', true), '','')) )
      );$f$, t);
  END LOOP;

  -- GRANTs (so careme_app can actually SELECT/INSERT/UPDATE/DELETE)
  FOREACH t IN ARRAY both_keys || clinic_only || nullable_clinic LOOP
    EXECUTE format('GRANT ALL PRIVILEGES ON %I TO careme_app, careme_bypass', t);
  END LOOP;
END $$;
```
**EXEMPT tables (NO RLS):** organizations, clinics, users, refresh_tokens,
medicines_master. These are the tenancy root / auth / reference data; the
request sets the GUC by reading them, but they are not filtered. (If deeper
hardening is wanted later, clinics/users get an org-scoped policy — out of scope now.)

---

## 4. PHASE 3 — APP CODE: connection + GUC threading

### 4.1 `src/config/database.ts` — add `Tx` type + `family: 4` + (optional) bypass
```ts
export type Tx = Prisma.TransactionClient;
const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
// ... inside createPrismaClient:
const pool = new Pool({ connectionString: datasourceUrl, family: 4 }); // <- IPv4 pin (Render can't route Supabase IPv6 -> ENETUNREACH)
```
- `family: 4` is REQUIRED: the live `db.<ref>.supabase.co` host returns an AAAA
  (IPv6) record and Render's outbound can't reach it (`ENETUNREACH` we hit last session).
- Add `export const defaultTx: Tx = prisma as unknown as Tx;` (lets services
  default their `tx` param to the singleton when no transaction is active).

### 4.2 `src/config/tenant-session.ts` — FIX the GUC-scope bug
Change `withTenant` so the service ALWAYS uses the `tx` that has the GUCs set:
```ts
export async function withTenant<T>(req: any, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const { orgId, clinics, isOrgOwner } = tenantContextFromReq(req);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id',$1,true),
              set_config('app.current_clinics',$2,true),
              set_config('app.is_org_owner',$3,true)`,
      orgId, clinics.join(','), isOrgOwner ? 'true' : 'false');
    return fn(tx);                 // <-- tx is threaded; fn MUST use it
  });
}
```
Add a `withTenantHandler` Express wrapper for clean router usage:
```ts
export function withTenantHandler(handler: (req:any,res:any,tx:Tx)=>Promise<void>) {
  return (req:any,res:any,next:any) =>
    withTenant(req, (tx) => handler(req,res,tx)).catch(next);
}
```
GUARD `tenantContextFromReq`: if `clinics` is empty AND `!isOrgOwner`, throw a
clear error (prevents silent over-restriction when `loadUserRoles` didn't run).

### 4.2.1 `src/auth/middleware/auth.middleware.ts` — FIX Circular Dependency in `loadUserRoles`
Since `loadUserRoles` queries `user_clinic_roles` (which is under RLS) before the router's `withTenantHandler` runs, it must wrap its query in a transaction to set `app.current_user_id` and `app.current_org_id` GUCs so it can bypass RLS and read the user's roles:
```ts
export async function loadUserRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    const userId = req.user.id;
    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true),
                set_config('app.current_org_id', $2, true)`,
        userId,
        req.user?.orgId || '',
      );
      return tx.user.findUnique({
        where: { id: userId },
        include: {
          clinicRoles: {
            where: { status: 'ACTIVE' },
            include: { clinic: { select: { id: true, name: true } } },
          },
        },
      });
    });

    if (!user) {
      res.status(401).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    req.user.roles = user.clinicRoles
      .filter(cr => cr.status === 'ACTIVE')
      .map(cr => ({
        clinicId: cr.clinicId,
        clinicName: cr.clinic.name,
        role: cr.role,
      }));

    if (!req.user.activeClinicId && !req.user.isOrgOwner && user.clinicRoles.length > 0) {
      const primary = user.clinicRoles.find(cr => cr.isPrimary) || user.clinicRoles[0];
      req.user.activeClinicId = primary.clinicId;
    }

    next();
  } catch (error) {
    next(error);
  }
}
```

### 4.3 Services — add `tx?: Tx = defaultTx` param to EVERY method
Pattern (apply to all 18 domain services):
```ts
async create(input: CreatePatientInput, tx: Tx = defaultTx): Promise<Patient> {
  return tx.patient.create({ data: { ...input, orgId: ..., clinicId: ... } });
}
```
- `prisma.` → `tx.` inside each method body (mechanical, 203 call sites).
- The two self-transacting services (inventory, prescriptions) ALREADY have
  `...Tx(tx)` helpers — refactor their outer `prisma.$transaction` to accept an
  injected `tx` and only open a new transaction when none was passed:
  ```ts
  async deductStock(input, tx?: Tx = defaultTx) {
    if (tx) return this.deductStockTx(tx, input);     // reuse RLS tx
    return prisma.$transaction(t => this.deductStockTx(t, input));
  }
  ```
- **PrescriptionService Nested Create Update**: Update `src/prescriptions/prescription.service.ts` to map `orgId` and `clinicId` into the nested items nested array, since `prescription_items` now has `NOT NULL` tenant columns:
  ```ts
  // In prescription.service.ts:
  items: {
    create: input.items.map(item => ({
      orgId: clinic.orgId,
      clinicId: input.clinicId,
      medicineId: item.medicineId,
      customName: item.customName,
      dosage: item.dosage,
      // ...
    }))
  }
  ```
- **EXEMPT:** `src/auth/auth.service.ts` keeps its own `PrismaClient` and is
  never wrapped in `withTenant` (register/invite bootstrap cross-tenant orgs).

### 4.4 Routers — wrap tenant routes in `withTenantHandler`
For each of the 14 unwired routers (patients, inventory, billing, staff, visits,
attendance, payroll, leave, org, prescriptions, reminders, reports, medicines,
+ finish credentials/audit/appointments correctly), change handlers to:
```ts
router.get('/', authenticate, loadUserRoles, withTenantHandler(async (req, res, tx) => {
  const rows = await patientService.list(req.query, tx);   // tx threaded
  res.json(rows);
}));
```
**ORDERING RULE (critical):** `authenticate` → `loadUserRoles` → `withTenantHandler`.
`loadUserRoles` MUST precede `withTenant` so `clinics` is populated. For routes
that today use `verifyPatientAccess`/manual `scope.orgId` filters, KEEP them as
defense-in-depth but let RLS be the enforced floor.

---

## 5. PHASE 4 — ENV / DEPLOY (Render dashboard)

Since background workers (`careme-worker` and `careme-sweep`) do not run under a request handler GUC context, they must connect using the `careme_bypass` role (which has `BYPASSRLS` enabled), while the Express API (`careme-web`) uses the strict `careme_app` role.

### 5.1 Environment Variable Configuration by Service

**For `careme-web` (Express API):**
* `DATABASE_URL`: `postgresql://careme_app:CLINICos2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` (6543 PgBouncer pooled)
* `DIRECT_URL`: `postgresql://careme_app:CLINICos2026@db.lvotusljnaiirpvmhtdz.supabase.co:5432/postgres` (5432 direct, RLS session state is stored here)
* `SUPERUSER_URL`: `postgresql://postgres.lvotusljnaiirpvmhtdz:%23CLiniic_Os@db.lvotusljnaiirpvmhtdz.supabase.co:5432/postgres` (5432 direct, used for prisma migrations)

**For `careme-worker` and `careme-sweep` (Background Worker & Sweeper):**
* `DATABASE_URL`: `postgresql://careme_bypass:CAREme2026@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` (6543 PgBouncer pooled or direct, bypasses RLS)

### 5.2 Build Command Fixes in `render.yaml`
* Update the `buildCommand` on all services to align with the codebase's Prisma 7.8.0 + `@prisma/adapter-pg` driver adapter. Remove the manual `prisma@5.22.0` downgrade commands:
  ```yaml
  buildCommand: npm install --legacy-peer-deps && npx prisma generate && npm run build
  ```
- `DIRECT_URL` MUST be the **direct `db.` host**, not the pooler (pooler drops
  `SET LOCAL` session state). `family: 4` covers the IPv6 `ENETUNREACH`.
- Add `npx prisma migrate deploy` to the api **start** command (or a release
  step) so future deploys auto-apply migrations.

---

## 6. PHASE 5 — VERIFICATION (prove it works, end to end)

### 6.1 Static / build
- `npx prisma generate` (watch the Windows EPERM DLL lock — use `db push` if blocked).
- `npm run build` → `tsc --noEmit` must pass (all `tx` params typed).

### 6.2 DB-side check (read-only) — `scripts/verify-rls.ts`
```ts
// connect as careme_app, query pg_class for relrowsecurity/relforcerowsecurity
// on the 17 tenant tables → assert ALL true. (No GUC set → careme_app sees 0 rows.)
```
Run: `ts-node scripts/verify-rls.ts`.

### 6.3 Live isolation proof (authenticated, through the app)
1. `POST /api/v1/auth/login` {email: jane@gmail.com, password: password@123}
   → capture `accessToken`. (Must NOT return `ENOIDENTIFIER` — confirms `DIRECT_URL`
   is correct + `family:4` works.)
2. `GET /api/v1/patients` with `Authorization: Bearer <token>`
   → returns ONLY Jane's org/clinic rows; status 200.
3. Negative control: set the GUCs to a DIFFERENT org via a raw `careme_app`
   connection and `SELECT count(*) FROM patients` → must be 0 (policy blocks).
4. Org-owner check: a user with `isOrgOwner=true` + empty `current_clinics`
   still sees all clinics in their org (predicate `is_org_owner='true'` branch).

### 6.4 Cross-tenant leakage test (the real proof)
- Using the superuser connection, insert `p_a` (org_a) and `p_b` (org_b).
- Connect as `careme_app`, `SET LOCAL app.current_org_id='org_a'`,
  `app.current_clinics='clinic_a'`, `app.is_org_owner='false'`.
- `SELECT * FROM patients` → only `p_a`. `p_b` invisible. RLS enforced. ✅

---

## 7. FILE CHANGE MANIFEST (exact list)

**New files**
- `prisma/migrations/00010_prescription_items_tenant_columns/migration.sql`
- `prisma/migrations/00011_rls_tenant_isolation/migration.sql`
- `scripts/setup-roles.sql`
- `scripts/verify-rls.ts`
- `src/test/tenant-isolation.test.ts` (unit: context derivation + DB-backed proof)

**Edited files**
- `prisma/schema.prisma` — add `orgId`/`clinicId` to `PrescriptionItem`
- `src/config/database.ts` — `Tx` type, `family: 4`, `defaultTx`, bypass client
- `src/config/tenant-session.ts` — fix GUC threading, `withTenantHandler`, guard
- 18 service files — add `tx?: Tx = defaultTx`, `prisma.`→`tx.`
- 17 router files — wrap tenant routes in `withTenantHandler` (order: auth→loadUserRoles→withTenant)
- `render.yaml` — `DIRECT_URL`/`SUPERUSER_URL` keys, `migrate deploy` in start
- `CLAUDE.md` — update Load-bearing gaps section (RLS now rebuilt)

**NOT touched (intentionally)**
- `src/auth/auth.service.ts` — own PrismaClient, RLS-exempt
- boundary tables (organizations, clinics, users, refresh_tokens, medicines_master) — no RLS

---

## 8. EXECUTION ORDER (minute-by-minute)

1. Edit `schema.prisma` (PrescriptionItem keys).
2. Create migration 00010 (tenant columns + backfill).
3. Create migration 00011 (RLS policies + grants).
4. Create `scripts/setup-roles.sql`.
5. `npx prisma migrate dev` locally OR `db push` + manual SQL to apply 00010/00011.
6. Run `scripts/setup-roles.sql` as superuser (create roles).
7. Edit `database.ts` (Tx, family:4, defaultTx).
8. Edit `tenant-session.ts` (fix threading + handler + guard).
9. Edit 18 services (tx param + prisma.→tx.).
10. Edit 17 routers (withTenantHandler wrap, correct ordering).
11. `npm run build` — fix type errors.
12. Commit to a feature branch; push; Render picks up via `migrate deploy`.
13. Set Render env vars (DIRECT_URL/SUPERUSER_URL/careme_app creds).
14. Run `verify-rls.ts` + live isolation proof (§6).
15. Update CLAUDE.md.

---

## 9. RISKS / GOTCHAS (from last session, now pre-empted)

- **IPv6 `ENETUNREACH`** → `family: 4` in Pool. ✅
- **PgBouncer `ENOIDENTIFIER`** → app uses `DIRECT_URL` (5432) not pooler. ✅
- **prescription_items missing keys** → migration 00010 backfills. ✅
- **Nested transaction in inventory/prescriptions** → reuse `...Tx(tx)` helpers,
  only open new `$transaction` when no `tx` passed. ✅
- **`loadUserRoles` ordering** → explicit middleware order in every router. ✅
- **Stuck `_prisma_migrations` (P3009/P3018)** → if a migration fails, clear
  `applied_steps_count=0` records before re-running; never leave a failed record. ✅
- **Windows EPERM on `prisma generate`** → reboot / pause Defender / Stop-Process
  the DLL holder; `db push` still works to move schema. ✅
