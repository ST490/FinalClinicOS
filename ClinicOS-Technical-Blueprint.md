# ClinicOS — Technical Blueprint

**Scope note:** This blueprint is scaled for a solo/small-team build using AI coding agents (Claude Code, etc.), targeting an initial launch to real customers — not a 200-engineer enterprise rollout. Where an "enterprise standard" practice (e.g. microservices, multi-cloud, SOC2) would slow down or complicate an early-stage build without adding real value yet, this document says so explicitly and recommends the pragmatic alternative, with a note on when to revisit it.

Decisions already locked from product discovery are treated as fixed inputs, not re-litigated:
- Money never touches the platform (clinics collect payment offline; platform tracks dues only)
- WhatsApp via official Business API through a BSP, one number per clinic
- Global from day 1, no data residency preference
- Hierarchy: **Master (org) → Sub-Master (clinic) → Staff (roles)**
- Medicine database is country-selected at signup, changeable in settings
- Landing page customization = banner + accent color only (no page builder)
- AI is a build tool, not a customer-facing product feature (v1)

---

## 1. Executive Overview

**Vision:** Give any doctor or clinic chain, anywhere in the world, a fully branded digital practice — patient-facing website, booking, records, inventory, staff management, and WhatsApp communication — as a subscription, with zero setup effort beyond signing up and adding staff.

**Primary objectives**
- Replace the fragmented stack a clinic currently cobbles together (register book, WhatsApp group, Excel inventory, paper Rx) with one system.
- Let a clinic chain (Master) onboard new branches (Sub-Masters) in minutes.
- Make white-labeling trivial — patients should never see "ClinicOS," they should see their clinic's brand.

**User value**
- Owners: one dashboard for revenue/inventory/staff visibility across all branches.
- Doctors: faster charting, drug lookup, less admin.
- Patients: a real booking page instead of a phone call.

**Business goals**
- Land clinic chains (Master accounts), not just single clinics — larger contract value, lower CAC per clinic.
- Keep infra cost per clinic low enough that early low-price plans are still profitable.

**Engineering goals**
- Ship a working core loop (patients → appointments → inventory → Rx) before anything else.
- Build multi-tenant from day one (retrofitting tenancy later is the #1 cause of SaaS rewrites).
- Keep the system boring and debuggable — one person needs to operate this.

**Long-term scalability goals**
- Support thousands of clinics, tens of thousands of staff users, without re-architecting the data layer (tenant-scoped from day 1 makes this a scaling problem, not a redesign problem).
- Leave room to add a real customer-facing AI layer later (symptom-to-drug lookup, forecasting) without restructuring core services.

---

## 2. Functional Requirements

Each module below: purpose, workflow, inputs/outputs, permissions, key edge cases. Validations are covered in §8 (DB constraints) and §9 (API validation) to avoid repetition.

### 2.1 Organizations & Clinics (Master/Sub-Master)
- **Purpose:** model a chain (org) containing one or more clinics.
- **Workflow:** Master signs up → creates Org → adds Clinic(s) → assigns a Sub-Master (existing or new user) to each clinic.
- **Inputs:** org name, country, clinic name/address/timezone/currency, sub-master email/phone.
- **Outputs:** clinic record with its own landing page slug (e.g. `clinicos.com/c/apollo-hebbal`).
- **Permissions:** only Master can create/delete clinics or reassign Sub-Masters.
- **Edge cases:** Sub-Master removed while staff still active (staff should be reassignable, not orphaned); Master account itself needs a person as fallback owner (can't be a role with no login); clinic deleted but has historical patient data (soft-delete, retain data per §15).

### 2.2 Patients
- **Purpose:** central patient record per clinic.
- **Workflow:** created by Receptionist/Nurse/Doctor at registration or walk-in; searchable by name/phone/ID.
- **Inputs:** name, DOB or age, gender, phone, address, allergies, tags.
- **Outputs:** patient profile with visit history, prescriptions, appointments.
- **Permissions:** all clinical staff can view/search; edit rights per role (Doctor/Nurse can edit clinical fields, Receptionist edits contact/demographic fields only).
- **Edge cases:** duplicate patient (same phone, different name spelling) — need merge tooling eventually, dedupe-on-phone warning at minimum for v1; patient transferring between clinics under the same org (should data follow, with consent, or stay siloed per-clinic? **Decision needed — flagged in §30**).

### 2.3 Appointments
- **Purpose:** scheduling, calendar, walk-in queue.
- **Workflow:** Receptionist/Nurse books a slot against doctor availability, or adds a walk-in to today's queue; doctor marks appointment complete/no-show.
- **Inputs:** patient, doctor, date/time or "next available", type (scheduled/walk-in).
- **Outputs:** calendar view (day/week), queue view for front-desk.
- **Permissions:** Receptionist/Nurse create & modify; Doctor views own schedule, marks status.
- **Edge cases:** double-booking same slot (must be prevented at DB + API level, not just UI); walk-in inserted mid-queue while scheduled patient is waiting (needs explicit priority rule); doctor cancels availability after slots already booked (must notify affected patients via WhatsApp).

### 2.4 Billing (Dues Ledger — not payment processing)
- **Purpose:** record what a patient owes/paid, without moving money through the platform.
- **Workflow:** staff manually logs "charged ₹X, paid ₹Y via [cash/UPI/card — informational only], due ₹Z."
- **Inputs:** amount, payment method label, patient, linked appointment/prescription (optional).
- **Outputs:** per-patient due balance, per-clinic dues report.
- **Permissions:** Receptionist/Sub-Master; Pharmacist for pharmacy-counter sales.
- **Edge cases:** partial payments over multiple visits; write-offs/waived dues (should require Sub-Master approval, logged in audit trail).

### 2.5 Inventory
- **Purpose:** track stock, auto-deduct on sale, alert on low stock/expiry.
- **Workflow:** Pharmacist adds items (from public medicine DB or custom); each sale against a prescription or counter-sale deducts stock; system flags low-stock/near-expiry.
- **Inputs:** medicine (DB lookup or custom name), batch number, expiry date, quantity, unit price, reorder threshold.
- **Outputs:** stock levels, alerts, sales/analytics dashboard.
- **Permissions:** Pharmacist manages inventory; Doctor can reference stock when prescribing (e.g. warn "not in stock").
- **Edge cases:** same medicine, multiple batches with different expiry dates (must deduct oldest-expiry-first — FEFO, not FIFO); stock goes negative due to concurrent sales (needs row-level locking or optimistic concurrency, see §13); expired stock still physically present (should auto-flag, not auto-delete — pharmacist must act).

### 2.6 Reminders (WhatsApp/SMS)
- **Purpose:** appointment reminders, follow-ups.
- **Workflow:** triggered automatically (X hours before appointment) or manually (follow-up campaign) from a template.
- **Inputs:** template, patient/appointment reference, channel.
- **Outputs:** delivery status (sent/delivered/read/failed) from BSP webhook.
- **Permissions:** all clinical staff can trigger manual reminders; automated ones are system-triggered.
- **Edge cases:** patient has opted out (must track consent, see §15); BSP delivery failure (needs retry/fallback to SMS); template message outside WhatsApp's 24-hour session window (Meta requires pre-approved template messages outside active conversation — must design templates knowing this).

### 2.7 Prescriptions
- **Purpose:** digital Rx with drug lookup.
- **Workflow:** Doctor selects medicines from the country's public database (autocomplete) or adds a custom/compounded item, sets dosage/frequency/duration, saves against the patient visit.
- **Inputs:** patient, medicines (from DB or custom), dosage instructions, doctor notes.
- **Outputs:** printable/shareable Rx; feeds inventory deduction if dispensed in-house.
- **Permissions:** Doctor only creates/signs; Pharmacist views to dispense.
- **Edge cases:** doctor prescribes a medicine not in clinic's inventory (should still allow it — patient may buy outside); custom medicine name typed differently each time by different doctors (needs a per-clinic custom-medicine list, not free text every time).

### 2.8 Staff
- **Purpose:** manage roles, attendance, payroll.
- **Workflow:** Sub-Master invites staff by phone/email, assigns role; staff clocks in/out; Sub-Master runs payroll.
- **Inputs:** staff details, role, salary structure, attendance records.
- **Outputs:** attendance report, payroll summary.
- **Permissions:** only Sub-Master (or Master) manages staff/payroll for their clinic(s).
- **Edge cases:** staff working across multiple clinics under the same org (should be supported via multi-clinic role assignment, not duplicate accounts); role changed mid-month (payroll must handle prorated structure changes — or punt to "effective next cycle" for v1 simplicity).

### 2.9 Reports
- **Purpose:** revenue, patient, inventory trends — per clinic and rolled up per org.
- **Workflow:** dashboards computed from underlying transactional tables (see §8), filterable by date range/clinic.
- **Permissions:** Sub-Master sees own clinic; Master sees all clinics under the org.
- **Edge cases:** org-level rollup across clinics in different currencies (must store/display per-clinic currency, don't silently sum mismatched currencies).

### 2.10 White-Label Landing Page
- **Purpose:** patient-facing branded page for booking/login.
- **Workflow:** Sub-Master sets logo, banner image, accent color at onboarding; page is generated from a fixed template.
- **Inputs:** logo file, banner image, hex accent color, clinic name/address/hours.
- **Outputs:** public page at a clinic-specific URL/subdomain.
- **Edge cases:** logo/banner wrong aspect ratio (enforce crop/recommended size in the upload UI, don't leave it to chance); custom domain mapping (v2 feature, not v1 — flagged in §28).

---

## 3. Non-Functional Requirements

| Category | Target (realistic for early-stage, not hypothetical enterprise scale) |
|---|---|
| **Performance** | API p95 < 300ms for standard CRUD; dashboard queries < 1.5s |
| **Scalability** | Design for 5,000 clinics / 50,000 staff users on current architecture before any re-architecture is needed |
| **Reliability** | 99.5% uptime target for v1 (not 99.99% — that requires multi-region active-active, premature at this stage) |
| **Availability** | Single-region, multi-AZ deployment; documented plan to go multi-region later (§28) |
| **Latency** | WhatsApp reminder dispatch within 5 minutes of scheduled trigger time |
| **Consistency** | Strong consistency for inventory deduction and appointment booking (no double-booking, no negative stock); eventual consistency acceptable for analytics/reports |
| **Fault tolerance** | Queue-based retry for WhatsApp/SMS sends; DB transaction rollback on partial failures (e.g. Rx save + inventory deduction must be atomic) |
| **Maintainability** | Modular monolith (§6) specifically to keep this maintainable by 1–3 engineers |
| **Security** | See §14 |
| **Accessibility** | WCAG 2.1 AA for the patient-facing landing page at minimum (booking must be usable by everyone) |
| **Localization/i18n** | UI text externalized from day 1 (even if only English shipped first); currency/timezone/date-format per clinic, not hardcoded |
| **Compliance** | See §15 |
| **Backup strategy** | Automated daily DB snapshots, 30-day retention minimum, tested restore quarterly |
| **Disaster recovery** | RPO ≤ 24h, RTO ≤ 4h for v1 (tighten as customer base grows) |
| **Rate limits** | Per-clinic and per-user API rate limits to prevent one tenant's bug/abuse from degrading others (critical in multi-tenant systems) |
| **Expected load (year 1)** | Low hundreds of clinics, thousands of daily appointments — plan for this, don't over-build for millions of users you don't have yet |
| **Scaling milestones** | Re-evaluate DB sharding/read replicas at ~500 clinics or when a single Postgres instance shows sustained >60% CPU |

---

## 4. User Personas

| Persona | Goals | Permissions | Typical Workflow |
|---|---|---|---|
| **Master (Org Owner)** | Oversee all clinics, add branches, see rolled-up revenue | Full org access, billing with ClinicOS, add/remove clinics & sub-masters | Logs in weekly to review cross-clinic reports, onboards new branch |
| **Sub-Master (Clinic Owner)** | Run their clinic day-to-day | Full access within their clinic only | Daily login, manages staff, reviews clinic reports |
| **Doctor** | See patients, prescribe, manage own schedule | Patient records, Rx, own appointment calendar, drug DB | Sees patient → checks history → prescribes → moves to next |
| **Nurse** | Support doctor, manage intake | Appointments, vitals/history entry, reminders | Registers walk-ins, records vitals before doctor sees patient |
| **Pharmacist** | Manage stock, dispense | Inventory CRUD, stock deduction, low-stock alerts | Checks Rx, dispenses, deducts stock, restocks when low |
| **Receptionist** | Front-desk operations | Appointments, patient registration, dues entry | Books/manages appointments, registers new patients, logs payments |
| **Patient** | Book appointment, see own basic info | Public landing page: book, view own appointment status | Visits clinic's branded page, books a slot |
| **Guest (unregistered visitor)** | Learn about clinic, book first visit | View landing page, submit booking request | Lands on page via WhatsApp/Google, books |
| **ClinicOS Support (internal)** | Help clinics troubleshoot | Read-only or scoped impersonation access, audit-logged | Investigates a reported bug with explicit, logged access |
| **API Consumer (future)** | Integrate ClinicOS with other tools | Scoped API key access (v2+, not v1) | N/A for v1 — flagged for roadmap |

---

## 5. User Journey Maps

Documenting the journeys that actually carry risk if unhandled — not an exhaustive enumeration of every trivial click path.

**5.1 Signup → First Booking (happy path)**
Master signs up → picks plan → creates first clinic → sets branding → invites Sub-Master → Sub-Master invites staff → Receptionist adds first patient → books first appointment → WhatsApp confirmation sent.

**5.2 Error/interruption paths that must be explicitly handled**
- **Payment/plan step abandoned mid-signup:** org exists in a "pending" state — must not create a fully active tenant with no clinic, and must allow resuming signup rather than starting over.
- **Session expires mid-appointment-booking:** in-progress slot selection should not silently double-book if the user resubmits after re-login (idempotency key on booking requests, §9).
- **Two receptionists book the same slot simultaneously:** last-write-wins is unacceptable here — must use a DB-level unique constraint or lock (§8/§13), and the losing request gets a clear "slot just taken" error, not a silent overwrite.
- **Pharmacist and a prescription-driven sale deduct the same batch at the same time:** same concurrency concern as above — inventory deduction must be transactional.
- **WhatsApp reminder fails to send (BSP downtime or invalid number):** must retry with backoff, then fall back to SMS or flag for manual follow-up — not fail silently.
- **Staff member's role is changed while they have an active session:** permission changes should take effect on next request, not require full re-login, to avoid stale-privilege windows.
- **Multi-device usage** (e.g. Doctor on desktop + tablet simultaneously): last-save-wins is acceptable for patient notes in v1, but the record should show "last edited by / at" so conflicting edits are at least visible.
- **Offline scenario (patchy clinic internet):** v1 does not need full offline-first support (see §28 for later), but the frontend must clearly show "not saved — check connection" rather than silently losing data.

---

## 6. System Architecture

### 6.1 Microservices vs. Modular Monolith — decision

| | Microservices | Modular Monolith |
|---|---|---|
| Team size fit | Needs a team per service to be worth it | Fits 1–3 engineers |
| Operational overhead | High (service discovery, distributed tracing, network failure modes) | Low (one deployable, one log stream) |
| Data consistency | Hard (cross-service transactions) | Easy (single DB, real transactions) |
| Time to ship v1 | Slow | Fast |
| Scaling | Scale each service independently | Scale the whole app; split out hot spots later if needed |

**Recommendation: Modular Monolith.** Structure the codebase into clear internal modules (patients, appointments, inventory, prescriptions, billing, staff, notifications) with well-defined interfaces between them, deployed as a single service. This gives you the *option* to extract a module into its own service later (e.g., if the notification/reminder worker needs independent scaling under load) without paying the distributed-systems tax now, when you have zero clinics running in production.

### 6.2 High-Level Component Diagram (described)

```
[Patient Browser] ---> [Landing Page / Booking (public)] --\
                                                              \
[Staff Browser/App] -> [Web App (auth'd dashboard)] --------> [API Layer (modular monolith)]
                                                              /        |        |         \
                                                    [Postgres]   [Redis Cache]  [Job Queue]  [Object Storage]
                                                                                    |
                                                                          [Notification Worker] --> [WhatsApp BSP API] / [SMS Gateway] / [Email]
```

- **Frontend:** one web app serving both the patient-facing landing pages (public routes) and the authenticated staff dashboard (protected routes) — no need for two separate frontends.
- **API Layer:** single backend service, internally modularized (see §13).
- **Database:** single Postgres instance (multi-tenant, shared schema, tenant-scoped — see §8), with read replica added once read load justifies it.
- **Cache:** Redis for session data, rate limiting counters, frequently-read reference data (e.g. medicine DB lookups).
- **Queue:** for anything that shouldn't block the API response — WhatsApp sends, report generation, email — a simple job queue (e.g. BullMQ/Postgres-backed queue) is sufficient at this scale; no need for Kafka.
- **Object Storage:** S3-compatible, for logos/banners and any patient document attachments.
- **CDN:** in front of static assets and the public landing pages.
- **Notification Service:** a background worker consuming the queue, calling the WhatsApp BSP / SMS / email providers, and writing delivery status back.
- **Logging/Monitoring:** centralized structured logs + an APM tool (see §24) — not a custom-built observability stack.
- **No AI layer in v1** — customer-facing AI is out of scope per product decision; leave clean module boundaries so a future AI feature (e.g. AI-assisted charting) can be added without restructuring.

---

## 7. Technology Stack Recommendation

| Layer | Recommendation | Why | Alternatives considered |
|---|---|---|---|
| Frontend | Next.js (React) | SSR for the public landing pages (SEO + fast first paint for patients), same framework serves the authenticated dashboard | Plain React SPA (weaker SEO for landing pages), Vue (smaller ecosystem, no strong reason to deviate) |
| Backend | Node.js (TypeScript), NestJS or a lightweight Express+modules setup | Type-safety across a solo-maintained codebase; huge ecosystem; same language as frontend reduces context-switching for AI-agent-assisted development | Django/Python (fine alternative, slightly weaker fit if frontend is also TS), Go (better raw performance, not the bottleneck at this stage, slower to iterate) |
| Database | PostgreSQL | Relational integrity matters here (appointments can't double-book, stock can't go negative) — this is not a NoSQL-shaped problem | MongoDB (would fight you on the exact constraints that matter most — see §8) |
| Cache/Queue | Redis (+ BullMQ for jobs) | One piece of infra doing two jobs; mature, well-documented | RabbitMQ/Kafka (real overkill at this volume) |
| Object Storage | AWS S3 (or Cloudflare R2 for lower egress cost) | Standard, reliable, cheap at this scale | Self-hosted MinIO (more ops burden for no benefit pre-scale) |
| WhatsApp/SMS | BSP (Interakt, AiSensy, Gupshup, or Twilio) — pick one, see §19 | Required for official WhatsApp Business API access | Unofficial WhatsApp libraries — **explicitly rule out**: violates Meta ToS, accounts get banned, not viable for a paid product |
| Auth | Self-built JWT + refresh tokens, or Clerk/Auth0 if you want to buy vs. build | Multi-tenant auth with custom role hierarchy (Master/Sub-Master/Staff) is somewhat bespoke — evaluate whether a third-party auth provider's multi-tenancy model actually fits before adopting one | Third-party auth (fast to start, but fitting your exact org→clinic→role hierarchy into someone else's tenancy model can cost more time than it saves) |
| Hosting | Single cloud provider — AWS or a simpler PaaS (Render/Fly.io) to start | Simplicity of one bill, one IAM model, one region to reason about | Multi-cloud (adds real complexity for zero benefit at this stage — actively avoid) |

**Expected lifespan / enterprise readiness:** every technology above is mainstream, widely supported, and not a betting-the-company choice — appropriate, since the actual differentiator here is the product/workflow fit for clinics, not exotic tech.

---

## 8. Database Design

Shared database, shared schema, **every tenant-scoped table carries `org_id` and/or `clinic_id`**, enforced at the query layer (and ideally via Postgres Row-Level Security as a second line of defense — see §14). This is the pragmatic choice for a solo build: one database to operate, one migration path, one backup job — with tenant isolation enforced in code/RLS rather than via separate databases per clinic. Revisit only if a specific enterprise customer contractually requires physical data isolation.

### 8.1 Core Tables (key columns only — full DDL is an implementation task, not a blueprint task)

```
organizations
  id (uuid, pk)
  name
  country
  plan
  status (active/suspended)
  created_at, updated_at

clinics
  id (uuid, pk)
  org_id (fk -> organizations)
  name
  address, timezone, currency
  medicine_db_country
  logo_url, banner_url, accent_color
  landing_page_slug (unique)
  status
  created_at, updated_at, deleted_at (soft delete)

users
  id (uuid, pk)
  org_id (fk, nullable — set for Master-level users)
  name, email, phone (unique per org)
  password_hash
  status
  created_at, updated_at

user_clinic_roles          -- supports one staff member working multiple clinics
  id (pk)
  user_id (fk -> users)
  clinic_id (fk -> clinics)
  role (enum: master, sub_master, doctor, nurse, pharmacist, receptionist)
  status (active/invited/disabled)

patients
  id (uuid, pk)
  clinic_id (fk)
  name, dob, gender, phone, address
  allergies (text[] or jsonb)
  tags (text[])
  created_at, updated_at, deleted_at

patient_visits
  id (pk)
  patient_id (fk), clinic_id (fk), doctor_id (fk -> users)
  visit_date
  vitals (jsonb), notes (text)
  created_by (fk -> users)

appointments
  id (pk)
  clinic_id (fk), patient_id (fk), doctor_id (fk -> users)
  slot_start, slot_end
  type (enum: scheduled, walk_in)
  status (enum: booked, completed, no_show, cancelled)
  created_by (fk -> users)
  UNIQUE constraint on (doctor_id, slot_start) to prevent double-booking at the DB level

medicines_master             -- reference data, seeded per country, not tenant-scoped
  id (pk)
  country
  generic_name, brand_names (text[])
  dosage_forms (jsonb)

clinic_inventory
  id (pk)
  clinic_id (fk)
  medicine_id (fk -> medicines_master, nullable)
  custom_name (nullable — required if medicine_id is null)
  batch_no, expiry_date
  quantity, reorder_threshold, unit_price
  created_at, updated_at

inventory_transactions
  id (pk)
  clinic_inventory_id (fk)
  type (enum: sale, restock, adjustment, write_off)
  quantity_delta
  reference_type, reference_id (polymorphic link to prescription/sale)
  performed_by (fk -> users)
  created_at

prescriptions
  id (pk)
  patient_id (fk), doctor_id (fk), clinic_id (fk)
  visit_id (fk -> patient_visits, nullable)
  notes
  created_at

prescription_items
  id (pk)
  prescription_id (fk)
  medicine_id (fk, nullable), custom_name (nullable)
  dosage, frequency, duration

dues_ledger
  id (pk)
  clinic_id (fk), patient_id (fk)
  amount, amount_paid, payment_method_label
  status (enum: paid, partial, due, waived)
  recorded_by (fk -> users)
  created_at

staff_attendance
  id (pk)
  user_id (fk), clinic_id (fk)
  date, check_in, check_out, status

reminders
  id (pk)
  clinic_id (fk), patient_id (fk), appointment_id (fk, nullable)
  channel (enum: whatsapp, sms, email)
  template_id, scheduled_at
  status (enum: pending, sent, delivered, read, failed)
  provider_message_id

audit_logs
  id (pk)
  org_id, clinic_id, actor_id (fk -> users)
  action, entity_type, entity_id
  before (jsonb), after (jsonb)
  created_at
```

### 8.2 Design notes
- **Soft deletes** (`deleted_at`) on clinics, patients, and any clinically/legally significant record — health data typically cannot be hard-deleted immediately even on request (retention rules vary by jurisdiction, see §15) and hard-deleting business records breaks audit trails and reports.
- **Audit fields** (`created_at`, `updated_at`, `created_by`) on every table that staff can modify — non-negotiable for a healthcare-adjacent product, not just nice-to-have.
- **Partitioning:** not needed at launch; if `appointments` or `audit_logs` grow very large, partition by month once row counts justify it (thousands of clinics × years of history, not before).
- **Migration strategy:** standard versioned migrations (e.g. Prisma/Knex/TypeORM migrations) applied via CI/CD, never manual schema edits in production.
- **Expected growth:** design indexes around the actual hot queries — patient search by name/phone (needs a trigram or similar index for fuzzy search), appointments by clinic+date range, inventory by clinic+expiry.

---

## 9. API Design

- **Style:** REST, JSON, versioned from day one: `/api/v1/...`
- **Auth:** Bearer JWT in `Authorization` header; token carries `user_id`, active `clinic_id` (for staff who work multiple clinics, the client selects an active clinic context and the token/session reflects it), and `role`.
- **Tenant scoping:** every request is scoped server-side to the authenticated user's `org_id`/`clinic_id` — never trust a `clinic_id` passed in the request body/query for authorization decisions, only for the resource being fetched, and always cross-check it against the user's permitted clinics.
- **Pagination:** cursor-based for high-growth tables (appointments, audit logs); offset/limit acceptable for smaller/bounded lists (staff, clinics under an org).
- **Filtering/sorting:** consistent query param convention, e.g. `?status=due&sort=-created_at`.
- **Errors:** consistent envelope, e.g. `{ error: { code, message, field_errors? } }`, with real HTTP status codes (400/401/403/404/409/422/500) — not 200 with an error buried in the body.
- **Idempotency:** booking/sale/payment-record-type POST endpoints accept an `Idempotency-Key` header so a retried request (e.g. after a timeout) doesn't create a duplicate appointment/sale.
- **Rate limits:** per-user and per-clinic limits (see §3), returned via standard `429` + `Retry-After`.
- **Webhooks:** inbound from the WhatsApp BSP for delivery status — verify signature, process asynchronously via the queue, never block on it.
- **Versioning policy:** additive changes don't bump the version; breaking changes get a new `/v2` prefix with the old version supported for a defined deprecation window once external API consumers exist (not a concern for v1, since there are none yet).
- **OpenAPI:** maintain an OpenAPI spec generated from code annotations (not hand-written and separately maintained — it will drift) so it's always accurate and can be handed to any AI coding agent as ground truth.

### 9.1 Representative endpoint groups (not exhaustive — illustrative of the convention)

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| Orgs/Clinics | `POST /clinics`, `GET /clinics/:id`, `PATCH /clinics/:id`, `POST /clinics/:id/staff-invites` |
| Patients | `GET /patients?search=`, `POST /patients`, `GET /patients/:id`, `PATCH /patients/:id` |
| Appointments | `GET /appointments?date=&doctor_id=`, `POST /appointments`, `PATCH /appointments/:id/status` |
| Inventory | `GET /inventory?low_stock=true`, `POST /inventory`, `POST /inventory/:id/adjust` |
| Prescriptions | `POST /prescriptions`, `GET /prescriptions/:id` |
| Dues | `GET /dues?status=due`, `POST /dues`, `PATCH /dues/:id` |
| Reminders | `POST /reminders` (manual trigger), webhook: `POST /webhooks/whatsapp-status` |
| Reports | `GET /reports/revenue?range=`, `GET /reports/inventory` |

---

## 10. Authentication & Authorization

- **Primary method:** email/phone + password, JWT access token (short-lived, ~15 min) + refresh token (longer-lived, rotated on use, stored httpOnly).
- **2FA:** optional at launch, strongly recommended for Master/Sub-Master roles given they control staff and financial-adjacent (dues) data; OTP via SMS/WhatsApp is a natural fit since you already have that channel.
- **Passwordless option:** magic link or OTP login is a reasonable v1.5 addition — clinic staff are not always tech-comfortable, and password reset flows are a real support burden. Consider prioritizing this over SSO/passkeys, which solve a problem this user base mostly doesn't have.
- **SSO/Passkeys:** not needed for v1 — clinics aren't running their own identity providers. Revisit only if selling into a hospital-group enterprise account that requires it.
- **RBAC:** role is assigned per `user_clinic_role` row (§8.1); permission checks are role-based, not per-user special-cased — keep it simple and enumerable.
- **ABAC consideration:** the one attribute-based nuance you actually need is "is this user's role active *for this specific clinic*" (since one person can hold different roles at different clinics) — model this as part of RBAC via the join table rather than building a separate ABAC engine.
- **Session management:** refresh token rotation, with reuse-detection (if an old refresh token is used after rotation, invalidate the whole session — signals token theft).
- **Login security:** rate-limit login attempts per account and per IP; lock account after N failed attempts with a clear unlock path (don't silently lock a doctor out mid-clinic-day with no recovery).
- **Password policy:** reasonable minimum (length over complexity rules — NIST guidance favors long passphrases over forced special characters).
- **Account recovery:** phone/email-based reset; Master can reset a Sub-Master's or staff member's access as an admin override, logged in the audit trail.
- **Audit logs:** every login, role change, and permission-sensitive action logged (§8.1 `audit_logs`).

---

## 11. AI Architecture

**Explicitly out of scope for v1**, per product decision — AI is used to *build* the system, not as a customer-facing feature.

For completeness, flagging where AI could be added later without requiring a restructure, *if* the product direction changes:
- Drug interaction warnings on the Prescriptions module (would need a licensed drug-interaction dataset, not just an LLM — this is a correctness-critical use case, not a generative one).
- Inventory demand forecasting (a straightforward time-series model, not necessarily an LLM at all).
- Natural-language report queries for Masters/Sub-Masters.

None of this needs to be designed now. The only thing worth doing today is keeping module boundaries clean (§6, §13) so that, e.g., "add a forecasting service that reads inventory_transactions" is an additive change, not a rewrite.

---

## 12. Frontend Architecture

- **Routing:** public routes (landing pages, booking) fully separated from authenticated dashboard routes at the routing layer, with different layouts.
- **Layouts:** one shell for the staff dashboard (role-aware nav — a Pharmacist shouldn't see a "Prescriptions" nav item they can't act on), one lightweight shell for the public booking page (must load fast on a patient's mobile data connection).
- **Design system:** a small shared component library (buttons, forms, tables, modals) from day one — with dozens of similar CRUD screens (patients, staff, inventory), inconsistency compounds fast without this.
- **State management:** server state (patients, appointments, etc.) via a data-fetching/cache library (e.g. React Query/TanStack Query) rather than hand-rolled global state — this also gives you request deduping and background refresh for free.
- **Forms/validation:** shared schema validation (e.g. Zod) reused between frontend and backend so validation rules aren't duplicated and drifting.
- **Offline support:** not required for v1 (see §5, §28); the one must-have is *clear feedback* when a save fails due to connectivity, not full offline sync.
- **Accessibility:** WCAG AA at minimum on the public booking page (§3).
- **SSR vs CSR:** SSR (via Next.js) for public landing/booking pages (SEO + fast load); CSR is fine for the authenticated dashboard (SEO irrelevant there).
- **Error boundaries:** every major dashboard section wrapped in an error boundary so one broken widget (e.g. a report chart) doesn't take down the whole page for a doctor mid-consultation.

---

## 13. Backend Architecture

- **Structure:** modular monolith (§6) — one module per domain (patients, appointments, inventory, prescriptions, billing, staff, notifications, auth), each with its own service layer, data access layer, and clearly defined public interface that other modules call through (no module reaching directly into another's tables).
- **Pattern:** repository pattern for data access (keeps DB queries testable and swappable), simple service-layer business logic — full DDD/CQRS is unnecessary ceremony at this scale and would slow a solo build down for no real benefit yet.
- **Event-driven touches (not full event sourcing):** use domain events for things that trigger side effects across modules — e.g. `AppointmentBooked` triggers the notification module to schedule a reminder, `PrescriptionCreated` triggers inventory deduction. This keeps modules decoupled without needing a full event-sourced architecture.
- **Transactions:** any operation touching multiple tables that must succeed/fail together (e.g. save prescription + deduct inventory) wrapped in a single DB transaction.
- **Concurrency control:** optimistic locking (a `version` column) on inventory rows and appointment slots is sufficient at this scale — avoids the complexity of distributed locks, which you don't need with a single DB instance.
- **Background jobs:** WhatsApp/SMS sends, report generation, and scheduled reminder triggers run via the job queue (§6), not inline in the request/response cycle.

---

## 14. Security Blueprint

Scoped to what actually applies: you store health-adjacent data and communicate over WhatsApp/SMS; you do **not** process payments, so PCI-DSS is explicitly **not applicable**.

| Area | Approach |
|---|---|
| OWASP Top 10 | Standard mitigations: parameterized queries (ORM handles this — never string-concatenate SQL), output encoding to prevent XSS, CSRF tokens on state-changing requests from browser sessions, no `eval`/dynamic code execution on user input |
| Encryption | TLS everywhere in transit; encryption at rest for the database (most managed Postgres offerings provide this by default — confirm it's on, don't assume) |
| Secrets management | Environment-based secrets via your host's secret manager (e.g. AWS Secrets Manager) — never committed to git, never in plain `.env` files in production |
| SQL Injection | Prevented by ORM/parameterized queries as a rule, not case-by-case review |
| File upload security | Logo/banner/document uploads: validate file type by content (not just extension), scan for malware if budget allows, store outside the web root in object storage, serve via signed URLs |
| API abuse / bot protection | Rate limiting (§3, §9) plus CAPTCHA on the public booking form to prevent spam bookings |
| DDoS mitigation | Handled at the CDN/hosting layer (e.g. Cloudflare) rather than custom-built |
| Audit logging | Covered in §8/§10 — every sensitive action logged with actor, before/after state |
| Key rotation | Rotate API keys/secrets (BSP, cloud provider) on a schedule and immediately on suspected compromise |
| Secure headers | Standard set (CSP, HSTS, X-Frame-Options, etc.) via a middleware, not manually per-route |
| Zero trust / RLS | Postgres Row-Level Security as a defense-in-depth layer under the application-level tenant scoping (§8) — if a bug in application code forgets a `WHERE clinic_id = ...` clause, RLS is the backstop that prevents cross-tenant data leakage. This is the single highest-leverage security investment for a multi-tenant health-data product and should not be skipped even though it takes real setup time. |

---

## 15. Privacy & Compliance

Scoped honestly: you're not processing payments (PCI-DSS off the table) and not currently pursuing enterprise certifications (SOC2/ISO27001 are sales-driven certifications for later, once an enterprise customer asks for them — not a v1 engineering requirement). What *does* apply, because you store patient health data globally:

- **General principle across jurisdictions:** patient data is sensitive by default everywhere, even where no specific "HIPAA-equivalent" law is in force yet. Build to a consistent baseline (encryption, access control, audit logging, consent tracking, deletion capability) rather than a different implementation per country — it's cheaper to build once, well, than to bolt on per-region compliance later.
- **Region-specific laws that will apply to specific customers:**
  - US clinics → HIPAA (covers PHI handling, breach notification, business associate agreements — you would be a "business associate" to the clinic).
  - EU clinics → GDPR (right to access/export/delete, lawful basis for processing, data processing agreements with clinics as data controllers).
  - India clinics → DPDP Act 2023 (consent, purpose limitation, breach notification).
- **Consent management:** track explicit consent for WhatsApp/SMS communication per patient (required by WhatsApp Business Policy regardless of regional law, and increasingly required by regional privacy law too).
- **Data retention:** define a retention policy per data type (e.g. medical records retained longer than marketing consent records) — even a simple, documented policy is far better than none, and is often the first thing an auditor or a nervous enterprise customer asks for.
- **Right to deletion / export requests:** build the capability (even if manually executed by support at first) to export or delete a specific patient's data on request — retrofitting this after data model decisions are made is painful, so keep patient data in clearly identifiable, queryable tables from day one (already the design in §8).
- **Sub-processor transparency:** you'll be sending patient contact info to a WhatsApp BSP and possibly an SMS gateway — these are sub-processors from a privacy standpoint; document this in your privacy policy and any clinic-facing data processing agreement.

---

## 16. Performance Engineering

- **Expected concurrent users (year 1):** low hundreds of simultaneous staff sessions across all clinics — not a scale that requires aggressive optimization yet, but the *patterns* below should be in place from day one because retrofitting them later is expensive.
- **Database optimization:** indexes on the actual hot paths identified in §8 (patient search, appointments by date, inventory by expiry) — don't index everything speculatively.
- **Caching:** Redis cache for the medicine reference database (rarely changes, read constantly for autocomplete) and for clinic branding data (read on every public landing page load).
- **Query optimization:** avoid N+1 queries in list views (patients list showing latest appointment, etc.) via proper joins/eager loading.
- **CDN:** static assets and public landing pages cached at the edge.
- **Image optimization:** logos/banners resized/compressed on upload, served in modern formats (WebP) with fallback.
- **Load balancing/autoscaling:** a single well-sized instance (or two for redundancy) is sufficient at launch; configure autoscaling rules but expect them to rarely trigger in year one.
- **Benchmark targets:** see §3 (p95 < 300ms API, dashboard < 1.5s).

---

## 17. DevOps & Infrastructure

- **CI/CD:** every push to main runs tests + lints; merges to a release branch auto-deploy to staging; production deploy is a manual promote step (not fully automated yet — appropriate caution at this stage, revisit once test coverage is strong).
- **Git workflow:** trunk-based development with short-lived feature branches — appropriate for a small team, avoids the overhead of long-lived Gitflow branches.
- **Containerization:** Docker for consistent local/staging/production environments.
- **Infrastructure as Code:** Terraform (or your cloud provider's native IaC) even at small scale — makes disaster recovery ("rebuild everything from scratch") actually possible, and documents your infra as a byproduct.
- **Environments:** local, staging, production, at minimum — never test new features directly against production data.
- **Deployment strategy:** rolling deploys are sufficient at this scale; blue-green/canary deployments are premature optimization for a single-instance-class deployment — revisit once you have enough traffic that a bad deploy meaningfully impacts many clinics simultaneously.
- **Rollback:** every deploy must be one-command revertible — this matters more than blue-green sophistication at this stage.
- **Backups/DR:** covered in §3.

---

## 18. Cloud Architecture

| | AWS | GCP | Azure |
|---|---|---|---|
| Managed Postgres | RDS — mature, well-documented | Cloud SQL — solid | Azure Database for PostgreSQL — solid |
| Object storage | S3 — industry standard | GCS — comparable | Blob Storage — comparable |
| Ecosystem/hiring | Largest talent pool, most Stack Overflow answers, most Terraform modules | Strong, especially if you want to lean on Google's other services later | Strong if you anticipate enterprise customers already standardized on Microsoft |
| Cost at small scale | Comparable across all three; AWS has the most reserved-pricing options as you grow | Comparable | Comparable |

**Recommendation: AWS.** Not because it's technically superior for this workload — at this scale, any of the three would work fine — but because the ecosystem maturity (documentation, community troubleshooting, Terraform module availability) directly reduces the time an AI-agent-assisted solo build spends stuck on infrastructure issues. Revisit only if a specific enterprise customer requires a different cloud for procurement reasons.

**Explicitly avoid multi-cloud** at this stage — it triples operational complexity for a benefit (avoiding vendor lock-in) that doesn't matter yet at your scale.

---

## 19. Notification System

- **Channels:** WhatsApp (primary), SMS (fallback/where WhatsApp isn't viable), email (secondary, e.g. for Master/Sub-Master account notifications, not primarily for patients).
- **WhatsApp provider (BSP) — pick one:**

| BSP | Notes |
|---|---|
| Interakt / AiSensy | Popular, India-strong, reasonable pricing, good for India-heavy early customer base |
| Gupshup | Strong across India + broader Asia, enterprise-proven |
| Twilio | Best global reach and documentation, higher cost, strongest choice if your "some customers already" pipeline is geographically spread |

Given you said you already have some customers and are going global from day one, **Twilio** is the safer default for consistent behavior across countries; if your near-term customer base is India-concentrated, **Interakt or AiSensy** will be materially cheaper. This is a decision to make based on where your actual first customers are, not a technical constraint — flagged in §30.

- **Number provisioning:** each clinic gets its own WhatsApp Business number through your BSP account (white-labeled — patients see the clinic's name, not ClinicOS).
- **Template management:** WhatsApp requires pre-approved templates for messages sent outside a 24-hour active conversation window — build a small template library (appointment confirmation, reminder, follow-up) and get them approved per BSP's process ahead of launch, not as an afterthought.
- **Retry strategy:** failed sends retried with backoff; after N failures, fall back to SMS if configured, otherwise surface to staff as "reminder failed — contact patient manually."
- **Delivery tracking:** BSP webhook updates `reminders.status` (§8) — surfaced in the dashboard so staff can see if a reminder actually reached the patient.
- **Consent/opt-out:** required (§15) — track per patient, respect it before every send.

---

## 20. Search Architecture

- **Patient search:** by name/phone, needs fuzzy/typo-tolerant matching (a patient's name is often misspelled inconsistently across visits). Postgres trigram search (`pg_trgm`) is sufficient at this scale — no need for a dedicated search engine (Elasticsearch/Algolia) yet.
- **Medicine autocomplete:** prefix + fuzzy match against the `medicines_master` table (§8), cached in Redis given it's read-heavy and rarely-changing reference data.
- **When to revisit:** if patient/medicine search performance degrades or you need advanced ranking/synonyms across a much larger dataset, that's the point to introduce a dedicated search engine — not before.

---

## 21. File Storage Architecture

- **What's stored:** clinic logos/banners, optionally patient document attachments (lab reports, scanned records) if that's added post-v1.
- **Storage:** S3-compatible object storage, private by default, served via short-lived signed URLs — never public buckets for anything patient-related.
- **Virus scanning:** run uploads through a scanning step (e.g. ClamAV or a cloud-native scanning service) before they're accessible, given files are uploaded by many different clinic users.
- **Encryption:** at-rest encryption enabled on the bucket (standard, low-effort, no reason to skip).
- **Lifecycle policies:** not urgent at launch; revisit for cost optimization once storage volume is meaningful (e.g. auto-archive old document attachments to cheaper cold storage after N months).

---

## 22. Billing Architecture (Ledger, Not Payment Processing)

To avoid any ambiguity given the section name in the original template: **ClinicOS does not process patient payments.** This section covers only:
- **Clinic-to-ClinicOS billing:** your own subscription billing (Master pays for the platform) — use a standard subscription billing provider (e.g. Stripe, or a regional equivalent) rather than building this yourself; this is the one place actual payment processing exists, and it's your revenue, not patient funds.
- **Patient dues ledger (§2.4, §8):** informational only — records what's owed/paid offline, no money movement, no PCI-DSS scope.
- **GST/tax on your own subscription invoices to clinics:** relevant to your business, not to patient billing.

---

## 23. Analytics

- **Business metrics (for you):** MRR, active clinics, churn, staff-per-clinic — standard SaaS metrics, trackable via your subscription billing provider + a lightweight product analytics tool.
- **Product metrics:** feature adoption per module (are clinics actually using Inventory, or just Appointments?) — informs roadmap prioritization.
- **Clinic-facing dashboards (§2.9):** revenue trends, patient trends, inventory analytics — computed from your own transactional tables, no separate analytics warehouse needed at this scale (a warehouse/ETL pipeline is a "revisit once you have real data volume" item, not a v1 need).
- **Error dashboards:** covered in §24.

---

## 24. Logging & Observability

- **Structured logging:** every log line as JSON with request ID, tenant ID, user ID — makes it possible to trace a single request/incident across the system.
- **Centralized log aggregation:** a managed logging service (e.g. your cloud provider's native offering, or a lightweight third-party like Better Stack) rather than SSH-ing into servers to `grep` logs.
- **APM/tracing:** a single APM tool (e.g. Sentry for errors + basic performance tracing) is sufficient at this scale — don't stand up a full distributed tracing stack (Jaeger/Zipkin) for a modular monolith with no service-to-service network calls to trace.
- **Alerting:** alert on error rate spikes, failed job queue processing, and WhatsApp delivery failure rate — these are the signals that actually indicate "a clinic is having a bad day."
- **Incident response:** even a lightweight documented process (who gets paged, where status is communicated) — appropriate for solo/small-team scale, don't over-engineer a formal on-call rotation you don't need yet.

---

## 25. Testing Strategy

| Type | Priority for v1 |
|---|---|
| Unit tests | High — especially for inventory deduction logic, appointment booking conflict logic, dues calculation — the places where a silent bug costs a clinic money or causes a double-booking |
| Integration tests | High — API endpoints against a real test database, covering the tenant-scoping logic specifically (a cross-tenant data leak is the worst-case bug for this product) |
| E2E tests | Medium — cover the core happy-path journeys (§5): signup → clinic setup → booking → prescription → inventory deduction |
| Load testing | Low priority for v1, revisit before a large clinic chain onboarding event |
| Security testing | Medium — at minimum, run tenant-isolation tests explicitly (can User A from Clinic X ever read Clinic Y's data through any endpoint?) and a basic OWASP-focused pass before launch |
| Accessibility testing | Medium — automated axe-core checks on the public booking page |
| Chaos/contract/visual regression testing | Low priority — genuinely not worth the investment at current team size and traffic; revisit at meaningfully larger scale |

---

## 26. Release Strategy

- **Alpha:** your existing early customers, closely supported, expect to find real bugs.
- **Beta:** wider rollout with feature flags to control which clinics see newer modules (e.g. roll out Inventory to a subset before general availability).
- **Feature flags:** simple flag system (even a `clinic_features` table) to enable/disable modules per clinic during rollout — also useful later for tiered pricing plans.
- **Migration/dark launches:** for schema changes, always design migrations to be backward-compatible with the currently-deployed code (deploy schema change, then deploy code that uses it — never both at once) to avoid downtime.

---

## 27. Maintenance Strategy

- **Dependency updates:** scheduled (e.g. monthly) dependency update pass, automated via a tool like Dependabot/Renovate rather than ad hoc.
- **Database migrations:** always additive/backward-compatible where possible (§26).
- **Support workflow:** even a simple shared inbox/ticket tool is enough at this stage — the key requirement is that support actions on customer data (e.g. resetting an account) go through the same audited paths as normal application actions (§10, §14), not a backdoor admin script.

---

## 28. Future Roadmap

- Custom domain mapping for clinic landing pages (beyond the shared-domain slug in v1).
- Deeper landing page customization (section reordering, custom content blocks) — genuine page-builder, once basic branding proves insufficient for customer needs.
- Multi-region deployment — once you have clinics concentrated in a second geographic region where latency to a single-region deployment becomes a real complaint, not preemptively.
- Offline-first support for patchy-connectivity clinics — real engineering investment, justified once you have enough customers reporting this as an actual pain point.
- Customer-facing AI features (§11) — drug interaction checking, forecasting, natural-language reports — once the core product is stable and you have usage data to know which would actually matter.
- API for third-party integrations, once external demand exists (e.g. a clinic wanting to connect ClinicOS to their accounting software).
- Enterprise certifications (SOC2, ISO27001) — pursue when a specific enterprise/hospital-group deal requires it, not speculatively.

---

## 29. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant data leak (Clinic A sees Clinic B's data) | Medium (easy mistake in multi-tenant code) | Critical — could end the business | RLS as a backstop (§14), explicit integration tests for tenant isolation (§25) |
| WhatsApp account/number gets banned by Meta for policy violation | Medium | High — core feature breaks for affected clinics | Use an official BSP (never unofficial libraries), respect template/opt-out rules strictly (§19) |
| Double-booking or negative stock due to concurrency bugs | Medium | Medium — trust-damaging but recoverable | DB-level constraints + transactions, not just application-level checks (§8, §13) |
| Solo/small-team bandwidth — one person can't do architecture, build, support, and sales simultaneously | High | High | Keep architecture deliberately simple (§6) specifically to reduce ongoing engineering burden |
| Regulatory requirement changes per country as you expand globally | Medium | Medium | Build to the conservative baseline (§15) so most regional requirements are already met, rather than a differerent implementation per country |
| BSP pricing changes or service instability | Low-Medium | Medium | Architecture should make swapping the BSP integration a contained change (isolated in the notification module, §13), not a system-wide rewrite |
| Customer data loss (backup failure) | Low | Critical | Automated backups + quarterly restore tests, not "we assume backups work" (§3) |

---

## 30. Unknowns — Explicit Open Questions

These are genuinely unresolved and should not be assumed away:

1. **Pricing model** — per clinic, per org, per staff seat, or usage-based? Affects billing architecture (§22) and feature-flagging design (§26).
2. **Which WhatsApp BSP** — depends on where your actual current customers are concentrated (globally spread → Twilio). You said you already have some customers — this should be resolved by looking at their locations, not guessed.
3. **Patient data portability across clinics under the same org** (§2.2) — should a patient's record follow them if they visit a different branch of the same chain? This is a real product decision with data-model implications, not just an engineering detail.
4. **Custom domain support timing** — is this needed for your first customers, or genuinely a v2 item? Affects whether DNS/domain-mapping work should be pulled into v1.
5. **Patient document attachments** (lab reports, scans) — in scope for v1 or later? Not in your original module list, but "Records, history" could imply it. Confirm before building file storage (§21) more elaborately than needed.
6. **Support/impersonation tooling** — how will you (or future support staff) actually help a confused clinic user without a backdoor into their account? Needs a designed, audited answer before you're fielding support tickets under time pressure.

---

# Builder Non-Negotiables

Everything below should be resolved or provided before full-speed development begins — not because development can't start without all of it, but because some of these block specific modules and are cheaper to settle now than mid-build.

## Business Requirements
- Final feature list for v1 launch (recommend: Patients, Appointments, Inventory, Prescriptions, Staff, basic Reports, White-label landing — defer Payroll depth and advanced Analytics if timeline is tight)
- Branding assets for ClinicOS itself (your logo, colors — separate from each clinic's white-label branding)
- Pricing model (§30.1)
- Terms of Service / Privacy Policy — needed before any clinic's real patient data enters the system, not an afterthought
- Initial target countries/regions (even a rough list, to prioritize which medicine databases and compliance baselines to seed first)

## Domains & Infrastructure
- Primary domain name + DNS access
- SSL (typically automatic via host/CDN — confirm your chosen provider handles this)
- Cloud account (AWS recommended, §18)
- Staging + production environments
- Email sending domain (for transactional email — account notifications, password resets)

## API Keys & Credentials Actually Needed (trimmed to what this product uses — not the generic full list)
- Cloud provider (AWS) access keys / IAM setup
- Postgres connection (managed RDS or equivalent)
- Redis connection
- Object storage (S3) credentials
- WhatsApp BSP account + API credentials (§19 — decide provider first)
- SMS gateway credentials (fallback channel)
- Transactional email provider (e.g. SendGrid/Resend/Postmark)
- Your own subscription billing provider (e.g. Stripe) — for Master-to-ClinicOS billing only, not patient payments
- Error monitoring (e.g. Sentry)
- CAPTCHA provider for the public booking form

*(Explicitly not needed for this product: OpenAI/Anthropic/AI provider keys for the product itself, since AI is a build tool not a shipped feature (§11); payment gateway for patient-facing transactions, since money never touches the platform; OAuth providers, unless you decide to add social login as a convenience later.)*

## Third-Party Integrations
| Service | Mandatory for v1? | Why |
|---|---|---|
| WhatsApp BSP | Yes | Core reminders feature |
| SMS gateway | Recommended | Fallback when WhatsApp fails/unavailable |
| Email provider | Yes | Account/notification emails |
| Object storage | Yes | Logos, banners, any documents |
| Subscription billing (Stripe or equivalent) | Yes | Your own revenue collection from Masters |
| CAPTCHA | Recommended | Spam protection on public booking |
| Error monitoring | Yes | You are the entire ops team — you need to know when something breaks before a customer tells you |

## Data Requirements
- Medicine database(s) per target country — identify licensed/public sources per country before building the lookup feature (e.g. India: CDSCO-derived datasets; US: FDA NDC directory) — sourcing and licensing terms vary and must be checked per country, not assumed freely reusable.
- Sample/seed data for development and demos (fake patients, appointments, inventory) — build a seeding script early, it pays for itself constantly during development.

## Security Requirements
- Secrets management approach decided before first production deploy (§14)
- IAM roles scoped per-service (don't run everything under one root cloud account key)

## Development Resources
- Git repository + branching convention (§17)
- A lightweight issue tracker (even a simple Kanban board) — mainly to keep the "Unknowns" (§30) and roadmap (§28) items from getting lost
- This document, kept up to date as decisions in §30 get resolved — it should be a living reference, not a one-time artifact

## Acceptance Criteria for "v1 Ready to Sell"
- Core loop works end-to-end without manual database intervention: signup → clinic created → staff added → patient registered → appointment booked → WhatsApp reminder delivered → prescription created → inventory deducted → due recorded
- Tenant isolation verified via explicit tests (§25), not just "seems fine in manual testing"
- Backups running and one restore actually tested (§3)
- Terms of Service / Privacy Policy live
- Error monitoring live and alerting to you personally
- At least one full clinic's realistic daily workflow walked through end-to-end by a real staff member (not just you) before wider rollout
