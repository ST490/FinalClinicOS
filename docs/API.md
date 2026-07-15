# Careme API Contract

Single source of truth for backend ↔ frontend communication. Mirrors the
Express routers in `src/` (1:1 with the route table in `src/index.ts`).

## Conventions

- **Base URL:** `/api` (configured via `VITE_API_URL`, default `http://localhost:4000/api`).
- **Auth:** `Authorization: Bearer <accessToken>` on every protected route.
  Tokens come from `/auth/login` / `/auth/refresh`.
- **Errors:** `{ "error": { "code": "STRING_CODE", "message": "...", "details"?: any } }`.
- **Paginated list responses:** `{ "data": T[], "total": number, "page": number, "limit": number }`.
- **Tenant scope:** every resource carries `clinicId` / `orgId`.
  MASTER/SUB_MASTER scope = org-wide; other roles = their assigned clinic only.

## Status codes

| Code | When |
|------|------|
| 200 | OK |
| 201 | Created |
| 400 | Validation (`VALIDATION_ERROR`) |
| 401 | Missing/expired token (`UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`) |
| 403 | Authenticated but lacks permission (`FORBIDDEN`, `INVALID_CREDENTIALS`) |
| 404 | Resource not found |
| 409 | Conflict (unique constraint — `CONFLICT`) |
| 429 | Rate-limited |
| 500 | Server error |

## Roles & permissions

Roles: `MASTER`, `SUB_MASTER`, `DOCTOR`, `NURSE`, `PHARMACIST`,
`RECEPTIONIST`, `HR`.

Permissions checked server-side (`src/auth/types/permissions.ts`).
`MASTER` always bypasses individual permission checks (org-owner shortcut).

---

## Health

### `GET /health`
Public. `{ status: "ok", timestamp: ISO8601 }`.

---

## Auth (`/api/auth`)

### `POST /auth/register`
Create org + MASTER user.
```json
{ "email"?: "x@y.z", "phone"?: "+91...", "password": "≥8 chars",
  "name": "≥2 chars", "orgName": "≥2 chars", "country": "IN" }
```
**201** → `{ accessToken, refreshToken, user: AuthUser }`.

### `POST /auth/login`
```json
{ "email"?: "...", "phone"?: "...", "password": "..." }
```
**200** → `{ accessToken, refreshToken, user }` (or `{ tempToken }` when 2FA is enabled).

### `POST /auth/refresh`
```json
{ "refreshToken": "..." }
```
**200** → `{ accessToken }`.

### `POST /auth/logout` 🔒
Body: `{ refreshToken }`. **200** → `{ success: true }`.

### `POST /auth/logout-all` 🔒
Invalidates every refresh token for current user. **200** → `{ success: true }`.

### `POST /auth/invite/sub-master` 🔒 *MASTER*
Invite a clinic owner (creates a SUB_MASTER + first clinic).
```json
{ "email"?: "...", "phone"?: "...", "name": "...", "role": "SUB_MASTER" }
```

### `POST /auth/invite/staff` 🔒 *MASTER | SUB_MASTER*
```json
{ "email"?: "...", "phone"?: "...", "name": "...",
  "clinicId": "uuid", "role": "DOCTOR|NURSE|PHARMACIST|RECEPTIONIST|HR" }
```

### `POST /auth/accept-invite?token=…`
Public. `{ token, password, name }`. **200** → `{ accessToken, refreshToken, user }`.

### `GET /auth/me` 🔒
**200** → `AuthUser`.

### `POST /auth/2fa/setup` 🔒
**200** → `{ secret, otpauthUri, qrCodeDataUrl }`.

### `POST /auth/2fa/verify` 🔒
`{ code: "6-digit" }`. **200** → `{ success: true }`.

### `POST /auth/2fa/verify-login`
`{ tempToken, code }`. **200** → `{ accessToken, refreshToken, user }`.

### `POST /auth/forgot-password` `{ email?, phone? }`
Always returns **200** to prevent enumeration.

### `POST /auth/reset-password` `{ token, password }` → **200**.

### `POST /auth/switch-clinic` 🔒 `{ clinicId }` → **200** `{ accessToken, refreshToken }`.

### AuthUser shape
```ts
{ id, email?, phone?, name, role, isOrgOwner, orgId,
  clinics?: { id, name, roleName }[] }
```

---

## Org / Clinic (`/api/orgs`, `/api/clinics`)

### `POST /orgs` 🔒 *org:manage* → `Org`
### `GET /orgs/:id` 🔒 *org:read* → `Org`
### `PATCH /orgs/:id` 🔒 *org:manage* → `Org`
### `DELETE /orgs/:id` 🔒 *org:manage* → `{ success: true }`

### `POST /clinics` 🔒 *clinic:manage* `{ orgId, name, address?, city?, state?, country?, postalCode?, phone?, email?, timezone?, currency?, locale? }` → **201**
### `GET /clinics?orgId=&status=&page=&limit=` 🔒 *clinic:read* → paginated
### `GET /clinics/:id` 🔒 *clinic:read* → `Clinic`
### `PATCH /clinics/:id` 🔒 *clinic:manage* → `Clinic`
### `PATCH /clinics/:id/branding` 🔒 *clinic:manage* `{ logoUrl?, bannerUrl?, accentColor?, landingPageSlug? }` → `Clinic`
### `DELETE /clinics/:id` 🔒 *clinic:manage* → `{ success: true }`

`Clinic` = `{ id, orgId, name, address, city, state, country, postalCode, phone, email, timezone, currency, locale, status, branding: { logoUrl, bannerUrl, accentColor, landingPageSlug } }`.

---

## Patients (`/api/patients`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/patients` | `patient:create` |
| GET | `/patients` (search: `query`,`clinicId`,`tags[]`,`bloodGroup`,`gender`,`fromDate`,`toDate`,`page`,`limit`,`sortBy`,`sortOrder`) | `patient:read` |
| GET | `/patients/:patientId` | `patient:read` |
| PATCH | `/patients/:patientId` | `patient:update` |
| DELETE | `/patients/:patientId` (soft) | `patient:delete` |
| POST | `/patients/:patientId/tags` `{ tag }` | `patient:update` |
| DELETE | `/patients/:patientId/tags/:tag` | `patient:update` |
| GET | `/patients/:patientId/stats` | `patient:read` |

`Patient` = `{ id, clinicId, name, email?, phone?, dateOfBirth?, gender?, bloodGroup?, allergies: string[], medicalHistory?, address?, city?, state?, postalCode?, country, tags: string[], whatsappConsent, smsConsent, createdById, createdAt, updatedAt }`.

---

## Appointments (`/api/appointments`) 🔒

| Method | Path |
|--------|------|
| POST | `/appointments` (`patient:create`-style — book) |
| GET | `/appointments` (`appointment:read`) |
| GET | `/appointments/:id` |
| PATCH | `/appointments/:id` (`appointment:update`) |
| DELETE | `/appointments/:id` (`appointment:cancel`) |
| GET | `/appointments/availability/:clinicId/:doctorId?date=YYYY-MM-DD` |
| GET | `/appointments/schedule/:clinicId/:doctorId` |

`Appointment` = `{ id, clinicId, patientId, doctorId, slotStart, slotEnd, status: 'BOOKED'|'CONFIRMED'|'IN_PROGRESS'|'COMPLETED'|'NO_SHOW'|'CANCELLED', type: 'SCHEDULED'|'WALK_IN', notes?, queuePosition?, isNewPatient?, createdById, createdAt }`.

---

## Visits (`/api/visits`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/visits` | `patient:create` |
| GET | `/visits` | `patient:read` |
| GET | `/visits/:id` | `patient:read` |
| PATCH | `/visits/:id` | `patient:update` |
| GET | `/visits/patient/:patientId/stats` | `patient:read` |

`Visit` = `{ id, clinicId, patientId, doctorId, visitDate, type, vitals, chiefComplaint, diagnosis, notes }`.

---

## Prescriptions (`/api/prescriptions`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/prescriptions` | `prescription:create` |
| GET | `/prescriptions` | `prescription:read` |
| GET | `/prescriptions/:id` | `prescription:read` |
| POST | `/prescriptions/:id/cancel` | `prescription:cancel` |
| POST | `/prescriptions/:id/dispense` | `inventory:manage` |

`Prescription` = `{ id, clinicId, patientId, doctorId, visitId?, notes?, signature?, status, items: [{ id, medicineId?, customName?, dosage?, frequency?, duration?, instructions?, quantity?, unitPrice?, totalPrice? }], createdAt }`.

---

## Inventory (`/api/inventory`, `/api/alerts`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/inventory` | `inventory:manage` |
| GET | `/inventory` (filter: `lowStock`, `expiringBefore`) | `inventory:read` |
| GET | `/inventory/:id` | `inventory:read` |
| PATCH | `/inventory/:id` | `inventory:manage` |
| DELETE | `/inventory/:id` | `inventory:manage` |
| POST | `/inventory/:id/deduct` `{ quantity, referenceType?, referenceId? }` | `inventory:manage` |
| POST | `/inventory/:id/adjust` `{ type, quantityDelta, batchNo?, expiryDate?, notes? }` | `inventory:manage` |
| GET | `/inventory/:id/history` | `inventory:read` |
| GET | `/alerts/low-stock/:clinicId` | `inventory:read` |
| GET | `/alerts/expiring/:clinicId` | `inventory:read` |

`InventoryItem` = `{ id, clinicId, medicineId?, customName?, customBrand?, batchNo?, expiryDate?, quantity, reorderThreshold?, unitPrice, mrp?, dosageForm?, strength? }`.

---

## Billing / Dues (`/api/dues`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/dues` | `dues:manage` |
| GET | `/dues` | `dues:read` |
| GET | `/dues/:id` | `dues:read` |
| GET | `/dues/patient/:patientId/balance` | `dues:read` |
| POST | `/dues/:id/pay` `{ amount, paymentMethod?, notes? }` | `dues:manage` |
| POST | `/dues/:id/waive` `{ reason }` | `dues:waive` |

`Due` = `{ id, clinicId, patientId, totalAmount, amountPaid, balance, status: 'PAID'|'PARTIAL'|'DUE'|'WAIVED', paymentMethod?, notes?, waiverReason?, appointmentId?, prescriptionId?, recordedById, payments: Payment[] }`.

---

## Staff (`/api/staff`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/staff/invite` | `staff:invite` |
| POST | `/staff/accept` (public) | – |
| GET | `/staff?clinicId=` | `staff:read` |
| GET | `/staff/:userId` | `staff:read` |
| PATCH | `/staff/:userId/role` `{ clinicId, role, isPrimary? }` | `staff:manage` |
| DELETE | `/staff/:userId?clinicId=` (deactivate) | `staff:delete` |
| POST | `/staff/schedules` `{ clinicId, userId, dayOfWeek, startTime, endTime, slotDuration?, isActive? }` | `staff:manage` |
| GET | `/staff/:userId/schedules?clinicId=` | `staff:read` |

---

## Attendance (`/api/attendance`) 🔒

| Method | Path | Permission |
|--------|------|-----------|
| POST | `/attendance/clock-in` `{ clinicId, userId, date?, checkIn?, status?, notes? }` | `attendance:manage` |
| POST | `/attendance/:id/clock-out` `{ checkOut? }` | `attendance:manage` |
| GET | `/attendance` | `attendance:read` |
| GET | `/attendance/today/:clinicId` | `attendance:read` |

---

## Audit (`/api/audit`) 🔒 *MASTER only*

### `GET /audit`
Query: `orgId, clinicId, userId, action, entityType, entityId, fromDate, toDate, page, limit`. Paginated.

### `GET /audit/entity/:entityType/:entityId`
Full entity timeline.

`AuditEntry` = `{ id, orgId?, clinicId?, userId?, action, entityType, entityId, before?, after?, ipAddress?, userAgent?, createdAt }`.

---

## Reminders (`/api/reminders`, `/api/webhooks/whatsapp-status`)

### `POST /reminders` 🔒
`{ clinicId, patientId, appointmentId?, channel: 'WHATSAPP'|'SMS'|'EMAIL', templateId, templateData?, scheduledAt }` → **201** `Reminder`.

### `GET /reminders` 🔒
Query: `clinicId, patientId, appointmentId, status, channel, page, limit`. Paginated.

### `GET /reminders/pending/:clinicId` 🔒 *internal/worker*
Returns reminders whose `scheduledAt <= now` and `status = 'PENDING'`.

### `POST /webhooks/whatsapp-status` *public (BSP callback)*
`{ messageId, status: 'SENT'|'DELIVERED'|'READ'|'FAILED', timestamp?, error? }` → `{ success: true }`.

`Reminder` = `{ id, clinicId, patientId, appointmentId?, channel, templateId, templateData?, status: 'PENDING'|'SENT'|'DELIVERED'|'FAILED'|'CANCELLED', scheduledAt, sentAt?, providerMessageId?, error? }`.

---

## Reports (`/api/reports`) 🔒 *MASTER / SUB_MASTER*

| Method | Path |
|--------|------|
| GET | `/reports/revenue/:clinicId?fromDate=&toDate=` (defaults: last 30 days) |
| GET | `/reports/patients/:clinicId?fromDate=&toDate=` |
| GET | `/reports/inventory/:clinicId` |
| GET | `/reports/staff/:clinicId?fromDate=&toDate=` |

Each returns a JSON aggregation shaped for the dashboard.

---

## Medicines (`/api/medicines`) 🔒

| Method | Path |
|--------|------|
| GET | `/medicines?country=&query=&category=&requiresPrescription=&page=&limit=` |
| GET | `/medicines/autocomplete?country=&q=&limit=` |
| GET | `/medicines/categories/:country` |
| GET | `/medicines/:id` |

`Medicine` = `{ id, name, brand?, category?, dosageForm?, strength?, manufacturer?, country, requiresPrescription }`.

---

## Frontend ↔ backend plumbing

The web app talks to this contract through `web/src/lib/`:

- `api.ts` — axios instance, JWT interceptor, 401 → redirect.
- `auth.ts`, `patients.ts`, `appointments.ts`, `inventory.ts`,
  `prescriptions.ts`, `billing.ts`, `staff.ts`, `reports.ts`,
  `dashboard.ts` — typed service wrappers per module.
- `useApiQuery.ts` — `useApiQuery<T>(fetcher, opts)` + `apiMutate`,
  with `demoData` swap for offline demo mode and consistent error
  extraction (`err.response.data.error.message`).

WebSocket realtime for reminders will be added in Agent 2's phase.
