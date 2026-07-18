Stack: Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis
Architecture: Modular monolith
Auth: JWT + refresh tokens with bcrypt @12, Redis rate limiting
Multi-tenancy: every table has clinic_id, org_id
Naming: camelCase variables, snake_case DB columns
No microservices. No over-engineering.

## Agentic OS Kernel
You are the COO of Careme Clinic OS. You route tasks to specialist agents:

| Agent | Role | Trigger |
|---|---|---|
| @dev | Code, architecture, debugging | User says "build", "fix", "refactor", "implement", "add feature" |
| @writer | Documentation, content, emails | User says "write", "draft", "blog", "document" |
| @researcher | Research, analysis, fact-checking | User says "research", "analyze", "compare" |
| @ops | DevOps, deployment, infrastructure | User says "deploy", "CI", "server", "docker" |

### Routing Rules
1. Match user intent to the Agent Registry trigger column.
2. Load agent file from `agents/<name>.md`.
3. Perform the task with scoped tools and constraints.

## Current phase: v0.9 alpha — code-complete, infra-bridge

Backend code covers 14 modules + Twilio notification (per Careme-Technical-Blueprint §2):
auth · org · patients · appointments · visits · prescriptions · inventory ·
medicines · billing · staff · attendance · audit · reminders · reports.

Mapped to blueprint §738 acceptance loop: signup → clinic → staff → patient →
appointment → WhatsApp → Rx → inventory deduction → due. Code is in place for
every step; only reminders + Rx→inventory flow need real run-time validation.

## Load-bearing gaps (must clear before declaring v0.9 done)

- Migrations exist (`init` + `appointment_category`) but 2 more are disabled in
  `prisma_pending_backup/` (RLS + unique slot index) pending re-dating — see
  `to_deploy.md`.
- No background queue (BullMQ/worker) — reminder dispatch is synchronous
- Test directory missing — zero coverage, no tenant-isolation tests yet

These gate progress to v1-beta per blueprint §738, §14, §25.

## Known environment wart: `prisma generate` EPERM on Windows

`npx prisma generate` intermittently fails with
`EPERM: operation not permitted, rename ...query_engine-windows.dll.node`
when something holds the engine DLL (usually Windows Defender real-time
scan or a lingering node/query-engine handle). This is a **Windows file lock,
not a code bug** and does not block functionality:

- Schema changes still reach the DB via `npx prisma db push` (works even
  when `generate` is blocked — use `db push`, not `migrate dev`, since there
  is no `prisma/migrations/` yet and `migrate dev` is interactive-only).
- The generated client's `.d.ts` is usually already current, so
  `tsc --noEmit` passes and reads/writes work.
- `prisma migrate dev` errors out as non-interactive in this environment.

Clear it by: reboot then `generate`; OR pause Defender real-time protection
then `generate`; OR `Stop-Process` the node/query-engine PID holding the DLL.

## Prisma ORM v7 (upgraded from 5.22.0 → 7.8.0)

Prisma 7 is a **breaking architecture change**, not a version bump. The schema
no longer holds connection URLs and the runtime client **requires a driver
adapter** — `new PrismaClient()` with no adapter throws.

What moved where:
- `prisma/schema.prisma` → `datasource db { provider = "postgresql" }` only.
  **No `url`, no `directUrl`** — those are gone from the schema for good.
- `prisma.config.ts` (new) → CLI/migrations config. Defines `schema` path +
  an async `adapter()` that builds a `pg.Pool` + `PrismaPg`. **Wired to
  `DIRECT_URL`** (session-mode, port 5432), not `DATABASE_URL` (pgbouncer
  transaction-mode, port 6543) — PgBouncer drops session state between
  statements, which breaks `prisma migrate`/`db push` and would break RLS.
- `@prisma/adapter-pg` is now a **runtime** dependency (was: only `pg` in
  devDeps). `pg` is still used directly for the `Pool`.

Runtime client instantiation (3 sites, all share the same pattern):
- `src/config/database.ts` — the singleton. `new PrismaClient({ adapter: new
  PrismaPg(new Pool({ connectionString: DIRECT_URL || DATABASE_URL })) })`.
  Keeps the old `transactionOptions` + dev `log` settings. Preserves the
  RLS design: the Pool uses DIRECT_URL so `SET LOCAL` in `withTenant()`
  survives across statements inside an interactive transaction.
- `src/auth/auth.service.ts` — `AuthService` no longer spins up its own
  `PrismaClient`; it reuses the `database.ts` singleton. It never set RLS
  GUCs itself, so sharing is correct and avoids a second Pool.
- `scripts/seed.ts`, `scripts/backfill-support-department.ts` — each builds
  its own adapter-backed client (they run outside the app, so they must not
  touch the dev `global.prisma` singleton). Same DIRECT_URL reasoning.

What did **not** change: the classic `prisma-client-js` generator is retained
and every `import { ... } from '@prisma/client'` across `src/` still works —
no import-path rewrites were needed. `npm run build` = `prisma generate && tsc`
and passes clean on v7.8.0.

Render build command (replace the old `npm install prisma@5.22.0 ...` line):
`npm install --legacy-peer-deps && npx prisma generate && npx tsc`
(No more pinning `prisma@5.22.0` — `package.json` now resolves 7.8.0. The
`@prisma/adapter-pg` runtime dep ships in the lockfile so the pool/adapter
are available at boot.)

## Pending (backend only; per blueprint sections)

1. Migrations + seed script (§735)
2. Queue + reminder worker (§6, §13)
3. Twilio webhook signature verify + retry/backoff (§19)
4. RLS policies on tenant tables (§14)
5. Object storage (S3/R2) service (§21)
6. Email provider (password reset + account notifications)
7. CAPTCHA on public booking (§14)
8. Subscription billing (Stripe) — Master-to-Careme only (§22)
9. 2FA / TOTP wiring (§10)
10. Consent/opt-out tracking per patient (§15)
11. Idempotency-Key middleware on POSTs (§9)
12. Optimistic locking on inventory + appointment slots (§8, §13)
13. OpenAPI from code annotations (§9)
14. Sentry + structured logging + APM (§24)
15. CI/CD pipeline (§17)
16. Staging environment + backup restore test (§3, §17)
17. ToS / Privacy Policy live

## Pending (frontend)

1. **Improve prescription print PDF** (later): currently the Rx letterhead is
   *composed* from whitelabel `logo` + `contact` + clinic/doctor names
   (`PrescriptionPrintSheet.tsx`, option (a) — deterministic, always prints).
   Known limitations to revisit when there's time:
   - Footer prints once at the end, not pinned to the bottom of every page
     (CSS `@page` fixed-position footer is unreliable across browsers).
   - Letterhead is typed/text, not a clinic's exact Word-exported layout. If a
     true "upload my Word letterhead as the base" is required, revisit
     pdf.js rasterization (was tried, dropped — pdf.js v6 worker + canvas
     rasterization was fragile/debug-heavy). Prefer server-side object storage
     (§21) for any uploaded letterhead asset.
   - Long prescriptions rely on browser pagination; verify multi-page breaks
     look clean (no row split mid-item) before shipping to clinics.

## Open from §30 + Builder Non-Negotiables (block full-speed)

- Pricing model (clinic / seat / usage)
- Supabase project + `DATABASE_URL` (port 6543) + `DIRECT_URL` (port 5432)
- Patient data portability across clinics under same org
- Patient document attachments (lab reports) — v1 or v2?
- Support/impersonation tooling (audited, not a backdoor)
- Initial target countries (medicine DB source: CDSCO/FDA/other)
- Primary domain + DNS access
- ToS + Privacy Policy drafts

## Frontend Mock-Data Reminder

`mock data = false` — the app runs against the real backend, not mocks.
The following still hardcode **fake clinic names** ("Downtown Specialty
Clinic", "Westside Family Practice", "Northside Urgent Care", "East Valley
Health") and must be swapped for real `useAuth().clinics` when those flows
are wired. Left as-is for now (no data removal needed while mock data is off):

- `web/src/mockData.ts` — clinic arrays are dead/unrendered (only
  `SHOW_DEMO_SWITCHER` is imported, by `App.tsx`).

White-label is now **functional, front-end only** (no backend yet):
- `web/src/lib/whitelabel.ts` — `WhitelabelConfig` type, `get/saveWhitelabel`
  (localStorage `wl:<clinicId>`), `readImageAsDataUrl` (canvas-downscaled
  base64), `DEMO_CONFIG` (sample content for the demo-showcase toggle).
- `web/src/pages/WhitelabelPage.tsx` — real editor: real `clinics` selector,
  logo/banner/building uploads, staffApi-sourced doctor cards, motion-banner
  toggle, contact/about/services, demo showcase, Save → localStorage.
- `web/src/pages/PublicLandingPage.tsx` — consumes `wl:<clinicId>` from
  localStorage (clinic id via `?clinic=`); falls back to `DEMO_CONFIG` when no
  saved config. No fake clinic-name presets remain.

Already converted to real `clinics`: `ReportsPage`, `PatientsPage`,
`DuesPage`. `PatientsPage` main list still renders mock `PATIENTS` rows —
wire to `patientApi` when mock data is addressed.

## Karpathy Guidelines (from andrej-karpathy-skills)

**Think Before Coding** — State assumptions explicitly. Present multiple interpretations when ambiguous. Push back when simpler approaches exist. Stop and ask when unclear.

**Simplicity First** — Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No flexibility/configurability that wasn't requested. If 200 lines could be 50, rewrite it.

**Surgical Changes** — Touch only what you must. Don't improve adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style. Every changed line should trace directly to the request.

**Goal-Driven Execution** — Transform tasks into verifiable goals: "Add validation" → "Write tests for invalid inputs, then make them pass." For multi-step tasks, state a brief plan with verify checks.

## Reference

- `Careme-Technical-Blueprint.md` — single source of truth for architecture, kept up to date as §30 unknowns resolve.
- `to_deploy.md` — deploy plan (Vercel + Render), env vars, deploy order. The
  full `render.yaml` / `vercel.json` wiring and the disabled-migration story
  live there; don't duplicate deploy notes here.
