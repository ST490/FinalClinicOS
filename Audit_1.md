# Careme — Full Project Audit

## 1. Executive Summary

| Dimension | Status |
|-----------|--------|
| **Phase** | v0.9 alpha — code-complete, infra-bridge |
| **Backend modules** | 14 of 14 implemented |
| **Frontend pages** | 13 pages + 5 role dashboards |
| **Total backend LOC** | ~7,350 (59 files) |
| **Total frontend LOC** | ~10,700 (52 files) |
| **Prisma schema** | 18 models, 14 enums, 978 lines |
| **DB migrations** | 2 applied (init + appointment_category) — schema has drifted |
| **Tests** | 1 test file, 7 test cases (auth middleware only) |
| **Docker** | None |
| **Background worker** | BullMQ queue defined, but worker **not started** from main process |
| **Known fix items** | 3 of 9 completed per `anti/task.md` |

---

## 2. Backend — Module Completeness

| Module | Lines | Files | Endpoints | Tests | Status |
|--------|-------|-------|-----------|-------|--------|
| **auth** | 1,464 | 9 | 15 | 1 file (7 cases) | ✅ Complete |
| **org** | 505 | 3 | 10 | 0 | ✅ Complete |
| **patients** | 621 | 3 | 8 | 0 | ✅ Complete |
| **appointments** | 527 | 3 | 7 | 0 | ✅ Complete |
| **visits** | 306 | 3 | 5 | 0 | ✅ Complete |
| **prescriptions** | 419 | 3 | 5 | 0 | ✅ Complete |
| **inventory** | 717 | 3 | 9 | 0 | ✅ Complete (FEFO) |
| **medicines** | 158 | 3 | 4 | 0 | ✅ Read-only |
| **billing** | 373 | 3 | 6 | 0 | ✅ Complete |
| **staff** | 536 | 3 | 9 | 0 | ✅ Complete |
| **attendance** | 247 | 3 | 4 | 0 | ✅ Complete |
| **audit** | 173 | 3 | 2 | 0 | ✅ Complete |
| **reminders** | 229 | 3 | 4 | 0 | ✅ Wired to BullMQ |
| **reports** | 207 | 2 | 4 | 0 | ✅ Complete |
| **notifications** | 260 | 4 | — | 0 | ✅ Twilio SMS/WhatsApp |
| **jobs** | 69 | 2 | — | 0 | ⚠️ Worker not started |

**Pattern consistency:** Every module follows `router.ts` + `service.ts` + `types/*.types.ts`.

---

## 3. Frontend — Page Completeness

| Page | Lines | API-wired | Tests |
|------|-------|-----------|-------|
| LoginPage | 129 | ✅ Real API | 0 |
| SignupPage | 156 | ✅ Real API | 0 |
| AcceptInvitePage | 162 | ✅ Real API | 0 |
| DashboardPage | 423 | ✅ Real API | 0 |
| PatientsPage | 680 | ⚠️ Still renders mock PATIENTS rows | 0 |
| AppointmentsPage | 558 | ✅ Real API | 0 |
| InventoryPage | 501 | ✅ Real API | 0 |
| PrescriptionsPage | 125 | ✅ Real API | 0 |
| DuesPage | 424 | ✅ Real API | 0 |
| ReportsPage | 1,145 | ⚠️ Hardcoded demo data | 0 |
| StaffPage | 704 | ✅ Real API | 0 |
| StaffDirectoryPage | 246 | ✅ Real API | 0 |
| AttendancePage | 395 | ✅ Real API | 0 |
| WhitelabelPage | 368 | ⚠️ localStorage only, no backend | 0 |
| PublicLandingPage | 366 | ⚠️ localStorage only, no backend | 0 |

**Role dashboards:** Doctor (217), Nurse (288), Pharmacist (272), Receptionist (296), HR (309) — all API-wired.

**API layer:** 11 service modules (`lib/`) — Axios-based wrappers with auto-refresh.

---

## 4. Blueprint Alignment

### ✅ Implemented & Aligned

- **Modular monolith** (§6) — 14 domain modules, single deployable
- **Multi-tenancy** (§8) — every table has `org_id` + `clinic_id`
- **JWT + refresh tokens** (§10) — 15min access, rotated refresh tokens
- **RBAC** (§10) — 7 roles, ~40 permissions mapped in `permissions.ts`
- **2FA/TOTP** (§10) — Setup, verify, login enforcement
- **Rate limiting** (§3, §9) — Redis sliding window, login + API + strict tiers
- **Fuzzy patient search** (§20) — insensitive full-text on name/email/phone
- **FEFO inventory** (§2.5) — First Expiry First Out deduction
- **Prescription → inventory deduction** (§5, §13) — Atomic dispense flow
- **Audit logging** (§8) — All sensitive actions logged with before/after
- **Zod validation** (§9) — Shared schemas for request validation
- **Soft deletes** (§8) — Patients, clinics, inventory items
- **WhatsApp templates** (§19) — 7 template functions in `templates.ts`
- **Clinic branding/white-label** (§2.10) — Frontend only (localStorage)

### ❌ Missing / Not Fully Aligned

| Blueprint § | Requirement | Status |
|---|---|---|
| **§6, §13** | BullMQ worker running as separate process | ⚠️ Worker code exists but never started |
| **§14** | Postgres Row-Level Security (RLS) | ❌ Not implemented |
| **§19** | Twilio webhook signature verification | ❌ Not implemented |
| **§19** | Retry/backoff on failed sends | ⚠️ BullMQ retries configured, no SMS fallback |
| **§9** | Idempotency-Key middleware on POSTs | ❌ Not implemented |
| **§8, §13** | Optimistic locking on inventory + appointments | ⚠️ App-level check, no `version` column |
| **§15** | Consent/opt-out tracking per patient | ✅ Schema has `whatsappConsent`/`smsConsent`, but frontend doesn't expose |
| **§9** | OpenAPI spec from code annotations | ❌ Not implemented |
| **§17** | CI/CD pipeline | ❌ Not implemented |
| **§17** | Docker containerization | ❌ Not implemented |
| **§21** | Object storage (S3/R2) for uploads | ❌ Not implemented (whitelabel images are localStorage base64) |
| **§10** | Passwordless login (magic link/OTP) | ❌ Not implemented |
| **§14** | CAPTCHA on public booking | ❌ Not implemented |
| **§22** | Subscription billing (Stripe) | ❌ Not implemented |
| **§24** | Sentry / structured logging / APM | ❌ Not implemented |
| **§2.2** | Patient merge/dedupe tooling | ❌ Not implemented |
| **§5** | In-progress session expiry handling | ❌ Not handled |
| **§25** | Tenant isolation tests | ❌ Not implemented |
| **§25** | Integration tests | ❌ Not implemented |
| **§25** | E2E tests | ❌ Not implemented |

### ⚠️ Partial / Needs Work

| Blueprint § | Item | Detail |
|---|---|---|
| **§9** | API versioning | Base path is `/api/v1` — correct |
| **§8** | Medicine autocomplete cache | Not Redis-cached despite being read-heavy |
| **§26** | Feature flags | Not implemented |
| **§20** | Postgres trigram search | Insensitive `contains` used, not `pg_trgm` |
| **§3** | Dashboard query < 1.5s | No performance testing |
| **§2.8** | Cross-clinic staff assignment | Schema supports it, untested |

---

## 5. Security & Tenant Isolation

### Strengths
- Every query explicitly filters by `clinicId`/`orgId`
- `verifyPatientAccess()`, `verifyClinicAccess()` helpers in each service
- RBAC permission matrix with `requirePermissions()` middleware
- Rate limiting on auth endpoints
- Refresh token rotation with reuse detection
- Password hashing at bcrypt @12
- 2FA secret encryption (AES-256-GCM)

### Gaps
- ❌ **No RLS policies** — the critical defense-in-depth backstop (§14) is missing
- ❌ **No tenant isolation tests** — the single worst-case bug vector has zero automated coverage (§25)
- ❌ **No idempotency keys** — double-booking of appointments/sales possible on retry (§9)
- ❌ **No webhook signature verification** — Twilio callbacks are unauthenticated (§19)
- ❌ **No file upload security** — no validation, no malware scanning, no signed URLs (§14, §21)
- ❌ **No CSP/HSTS security headers** — helmet is imported but no CSP policy configured

---

## 6. Data Layer

### Schema Health
- **18 models, 14 enums** — comprehensive coverage matching all blueprint modules
- **Multi-tenancy:** Every tenant table has `clinicId` + `orgId` with indexes ✅
- **Partial unique index** on appointments for double-booking prevention ✅ (raw SQL)
- **Decimal types** for monetary values ✅
- **Soft deletes** on Patients, Clinics, InventoryItems ✅
- **Consent tracking** fields on Patient model ✅

### Migration State
- `prisma/migrations/` has **2 migrations** (init + appointment_category)
- Schema has **drifted** — `UserClinicRole.department` and `SUPPORT` role enum value exist in schema but not in migrations
- `npx prisma db push` is the current workflow (no migration pipeline)

### Schema-Only (No Realization Yet)
- `ApiKey` model defined but no API key management endpoints
- `Organization.metadata` / `Clinic.workingHours` JSON fields defined but no frontend to set them

---

## 7. Infrastructure Gaps

| Need | Status | Priority |
|------|--------|----------|
| Docker / containerization | ❌ Not started | High |
| CI/CD pipeline | ❌ Not started | High |
| Staging environment | ❌ Not started | High |
| Production environment | ❌ Not started | High |
| Object storage (S3) | ❌ Config exists, no implementation | Medium |
| Email provider | ❌ Not configured | High |
| Sentry / error monitoring | ❌ Not started | High |
| Structured logging | ❌ Not started | Medium |
| Database backups + tested restore | ❌ Not started | High |
| Secrets management | ⚠️ Uses `.env` in dev, no production plan | High |

---

## 8. Known Issues (from `anti/`)

From `anti/implementation_plan.md` and `anti/task.md` — 9 fix items, **3 completed**:

### ✅ Completed (Items 1-3)
1. **DB query fixes** — Patient search leaking data across clinics (ignoring `clinicId`)
2. **Auth flows** — `acceptInvite` malformed token response fixed
3. **Tenant isolation** — `requireClinicAccess` middleware wiring fixed

### ❌ Remaining (Items 4-9)
4. **Inventory mechanics** — `quantity` column never updated on stock movement; FEFO batch tracking bug in shortage path
5. **Prescription integration** — Dispense never calls `deductStock`
6. **Billing waivers** — `waiveDue` erases `amountPaid` history
7. **Background jobs** — BullMQ Queue connection leak, uncaught Twilio failures
8. **Frontend wiring** — Clinic switcher doesn't call backend, stale query dependencies
9. **Verification/testing** — No test suite to validate fixes

---

## 9. Frontend-Specific Issues

- **PatientsPage** (line 680): Main list still renders mock `PATIENTS` rows instead of real API data
- **ReportsPage** (line 1,145): Hardcoded demo data, no real queries to `/api/v1/reports/*`
- **WhitelabelPage / PublicLandingPage**: No backend endpoint — config stored in localStorage only
- **Role gating at page level**: Any authenticated user can navigate to any route (gate is inside page component, not router)
- **`types.ts` vs `types/index.ts`**: Two separate type definition files with different content
- **No tests**: Zero test coverage across entire frontend
- **`ReportsPage.tsx`**: Largest file at 1,145 lines — needs decomposition

---

## 10. Recommendations (Priority-Ordered)

### Critical (block v1-ready per §738 criteria)
1. **Apply remaining anti/fixes** — items 4-9 address real bugs in core flow
2. **Start BullMQ worker** — reminder queue is dead without it
3. **Write tenant isolation tests** — single worst-case risk has zero coverage
4. **Add RLS policies** — defense-in-depth for multi-tenant data
5. **Set up error monitoring** (Sentry) — you're the ops team, you need alerts
6. **Run DB migration** — apply current schema to get `department`, `SUPPORT` role live

### High
7. **Wire PatientPage to real API** — mock data in main list blocks the core flow
8. **Wire ReportsPage to real API** — hardcoded demo data is misleading
9. **Add idempotency keys to POSTs** — prevents double-booking on retry
10. **Verify + test reminder → notification → WhatsApp flow** end-to-end
11. **Dockerize the application** — needed for staging/production deployment

### Medium
12. **Add Twilio webhook signature verification**
13. **Build white-label backend endpoints** — store/retrieve branding from DB
14. **Decompose ReportsPage** — 1,145 lines in one component
15. **Implement CSP and security headers** via helmet
16. **Consolidate type definitions** — `types.ts` and `types/index.ts` should merge
17. **Add seed data for all roles** — current seed has 1 org, 1 clinic, 7 users

### Low (v1-beta or later)
18. Object storage integration (§21)
19. OpenAPI spec generation (§9)
20. CAPTCHA on public booking (§14)
21. Subscription billing (Stripe) (§22)
22. CI/CD pipeline (§17)
23. Optimistic locking with `version` column (§13)
24. Passwordless login (§10)

---

## 11. Verification Commands

```bash
# TypeScript check (backend)
npx tsc --noEmit

# TypeScript check (frontend)
cd web && npx tsc --noEmit

# Run existing tests
npx vitest run

# Check Prisma schema drift
npx prisma db push --dry-run

# Lint
npx eslint src --ext .ts
```
