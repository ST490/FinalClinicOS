# Careme — Product Idea

## 1. What It Is
A white-labeled, multi-tenant SaaS platform for doctors/clinics worldwide — giving each clinic its own branded website, patient portal, and operations dashboard, without needing their own dev team. Built solo using AI coding tools (not AI-powered features for customers).

## 2. Business Model
- B2B SaaS sold directly to doctors, clinics, and clinic chains globally
- Money never touches the platform — clinics handle patient payments offline (cash/UPI/card, their own account)
- Platform manages: staff, inventory, patients, appointments, WhatsApp comms
- Pricing model — **TBD**

## 3. Account Hierarchy (Apollo Model)

```
Master (Organization / Chain Owner)
   │  buys the platform, manages billing with Careme
   │
   ├── Sub-Master (Branch / Clinic Owner) — one per clinic location
   │        │
   │        ├── Doctor
   │        ├── Nurse
   │        ├── Pharmacist
   │        └── Receptionist / Front-desk
   │
   ├── Sub-Master (Branch 2)
   │        └── ...
```

- A **Master** can add multiple clinics and assign a **Sub-Master** (owner) to each.
- Each clinic operates semi-independently under the org (own staff, own inventory, own landing page).
- Reporting/analytics should roll up to Master level as well as per-clinic.

## 4. User Journey

```
Main Website
   │
   ├── Existing customer → Login → Dashboard
   │
   └── New customer → "Buy Plan" → Signup + Payment
            │
            ▼
      Onboarding (capture: country, clinic name, branding basics)
            │
            ▼
      Customizable Landing Page generated
      (banner + accent color/theme — patient-facing, booking + login)
            │
            ▼
      Master/Owner logs into Dashboard
            │
            ▼
      Master adds Clinics → assigns Sub-Masters
            │
            ▼
      Sub-Master adds Staff → assigns Roles
            │
            ▼
      Each staff logs in → role-specific dashboard/features
```

## 5. Roles & Permissions

| Role | Key Permissions |
|---|---|
| **Master** | Adds/manages clinics, assigns sub-masters, org-wide reports, billing with Careme |
| **Sub-Master (Clinic Owner)** | Full control within their clinic: staff, inventory, reports, white-label settings |
| **Doctor** | Patient records, prescriptions (public drug DB lookup + custom meds), appointments |
| **Nurse** | Appointments, patient vitals/history entry, reminders |
| **Pharmacist** | Inventory management, stock deduction on sale, expiry/low-stock alerts |
| **Receptionist** | Appointments, walk-ins, patient registration |

*(Custom role/permission builder — possible future/Pro feature)*

## 6. Core Modules

| Module | Key Features |
|---|---|
| **Patients** | Records, medical history, smart search |
| **Appointments** | Slot management, calendar, walk-in queue |
| **Billing** | Track dues/ledger only — no in-platform payment processing |
| **Inventory** | Doctor/pharmacist-built catalog, autocomplete, auto-deduct on sale, low-stock & expiry alerts, visual analytics |
| **Reminders** | WhatsApp (primary), SMS, automated follow-ups |
| **Prescriptions** | Digital Rx, public medicine database lookup (country-specific, selectable) + custom meds |
| **Staff** | Roles, attendance, payroll |
| **Reports** | Revenue trends, patient trends, inventory analytics — per-clinic and org-wide (Master view) |
| **White-label** | Clinic name, logo, banner, accent color |

## 7. Key Decisions Locked In

| Topic | Decision |
|---|---|
| Payments | Never touch platform; clinic handles offline |
| WhatsApp | Use official API via a BSP (e.g. Interakt, AiSensy, Twilio) — each clinic gets its own branded WhatsApp Business number under your BSP account |
| Data residency | Not a customer concern — pick whatever's cheapest/simplest to start |
| Global reach | Yes, from day 1 — some customers already lined up |
| Medicine database | Set by country at signup, changeable later in settings |
| Landing page customization | Basic — banner + accent color/theme only, template-based (no page builder) |
| Multi-tenancy model | Org (Master) → Clinics (Sub-Master) → Staff |

## 8. Open Items (Decide Before/During Build)
- Pricing structure (per clinic? per org? per seat? per patient volume?)
- Which WhatsApp BSP to use
- Shared DB (tenant_id) vs. isolated DB per clinic — recommend shared DB with strict tenant scoping to start, for build speed
- Country field must be captured early at signup — drives currency, medicine DB default, WhatsApp/OTP phone formatting

## 9. Suggested Build Priority (Draft)
1. Auth + Master/Sub-Master/Staff hierarchy + role permissions
2. Patients + Appointments (core daily-use loop)
3. Inventory + auto-deduct on sale
4. Prescriptions + medicine DB (country-selectable)
5. WhatsApp reminders (BSP integration)
6. Billing/dues tracking (ledger only)
7. Reports/analytics (per-clinic + org rollup)
8. White-label landing page generator
9. Staff attendance/payroll
