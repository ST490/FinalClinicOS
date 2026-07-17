# DEPLOY.md — Careme Clinic OS

Exact deploy click-path + env-var reference. Generated from `to_deploy.md`
and the war-stories recorded in `CLAUDE.md` (learned 2026-07-16 during the
first successful deploy). Live URLs at the bottom.

> **Preferred path: Blueprint.** Connect this repo to Render as a Blueprint
> (`render.yaml` at repo root) — it creates `careme-web` (web), `careme-worker`
> (worker), `careme-sweep` (worker), and `careme-redis` in one step. The
> manual steps below were how v0.9 first went live; keep them only if you need
> to reproduce the ad-hoc setup.

---

## A. Backend — Render

### A1. Create the Web Service (manual) or use Blueprint
- New → Web Service → connect GitHub repo `FINAL clinic os`.
- **Root Directory:** `.` (repo root — backend is `src/`).
- **Build Command:**
  ```
  npm install prisma@5.22.0 @prisma/client@5.22.0 --legacy-peer-deps --no-save && npx prisma generate && npx tsc
  ```
- **Start Command:**
  ```
  npx prisma migrate deploy && node dist/index.js
  ```
- **Health Check Path:** `/health`
- **Plan:** Starter (or free).

> Prisma is pinned to EXACT `5.22.0` in the build command. Render's `npm
> install` drifts to Prisma 7.8.0, which rejects `url`/`directUrl` in
> `schema.prisma` (P1012). Never let Render grab 7.x. `.npmrc` with
> `legacy-peer-deps=true` alone did NOT stop the drift — the inline
> `npm install prisma@5.22.0` is what fixed it.

### A2. Create the two Workers (manual path only)
- **careme-worker:** type `worker`, Start `npm run worker`
  (`tsx src/jobs/worker.ts`).
- **careme-sweep:** type `worker`, Start `npm run worker:sweep`
  (`tsx src/notifications/reminder-processor.ts`).
- Both share the repo/image; worker commands don't bind a port.
- Either create a Render Redis instance and link it, or set `REDIS_URL` to
  Upstash. Without Redis the app **fail-opens** (rate limiting off, reminders
  stay PENDING for sweep) — not a crash, but reminders won't deliver.

### A3. Backend env vars (Render)
Paste these in the service Environment tab. Secrets marked `sync:false` in
`render.yaml` must be supplied by you.

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | **yes** | Supabase pooled Postgres, port **6543**. |
| `DIRECT_URL` | **yes** | Supabase session-mode Postgres, port **5432** (for `migrate deploy`). |
| `JWT_SECRET` | **yes** | App HARD-fails if unset in prod. |
| `ENCRYPTION_KEY` | **yes** | Exactly 32 hex chars (2FA secret encryption). |
| `SESSION_SECRET` | **yes** | Set it. |
| `CORS_ORIGINS` | **yes** | `https://careme-snowy.vercel.app` (comma-sep; `credentials: true`). |
| `NODE_ENV` | **yes** | `production`. |
| `PORT` | no | Render sets automatically — **DELETE if present in a reused `.env`**. |
| `REDIS_URL` | no* | BullMQ + rate limiting. **DELETE if it points at `redis://localhost`**. |
| `JWT_EXPIRES_IN` | no | `15m` |
| `REFRESH_TOKEN_EXPIRES_DAYS` | no | `7` |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW` | no | `5` / `300` |
| `API_RATE_LIMIT` / `API_RATE_WINDOW` | no | `100` / `60` |
| `TOTP_ISSUER` | no | 2FA issuer label. |
| `TWILIO_*` / `WHATSAPP_*` | no | Reminders/WhatsApp (feature-gated). |
| `S3_*` | no | Declared, no upload code yet — safe unset. |
| `SUPABASE_*` | no | Not required for core app. |
| `MEDICINE_DB_PROVIDER` / `MEDICINE_DB_COUNTRY` | no | `IN` default. |

\* Without `REDIS_URL` the app runs but reminders won't dispatch.

### A4. Migrations
`prisma/migrations/` has two applied migrations (`init`, `add_appointment_category`).
- Render Start Command runs `prisma migrate deploy` on every restart (idempotent).
- Pre-Deploy Command is a **paid** Render feature — not used on free tier; the
  Start Command covers it.
- Disabled migrations in `prisma_pending_backup/` are **not** applied (RLS
  re-triggers P3018; unique-index migration was never authored as SQL).
- Local fallback if `migrate` is blocked: `npx prisma db push` (syncs schema,
  no history). Prefer `migrate deploy`.
- Seed once (optional): `npm run db:seed` (`scripts/seed.ts`).

---

## B. Frontend — Vercel

- New Project → import `web/` (the **Root Directory MUST be `web`**, app lives
  there, not repo root).
- **Build Command:** `vite build` ONLY (no `tsc -b` — pre-existing frontend
  type errors are ignored by esbuild at runtime; revisit later).
- **Install Command:** `npm install` (in `web/`).
- **`vercel.json`** already has the SPA rewrite (`/(.*)` → `index.html`).
- **Build env var (required):**
  ```
  VITE_API_URL=https://careme-smzs.onrender.com/api/v1
  ```
  Without it the SPA 404s on `/api/v1`.
- Any NEW frontend file MUST be committed or Vercel's clone won't have it.

---

## C. Go-live validation

1. `GET https://careme-smzs.onrender.com/health` → `{ "status": "ok" }`.
2. Frontend login flow works end-to-end (CORS + JWT).
3. Create a reminder → worker/sweep dispatches it (Redis-dependent).

---

## D. You own these (cannot be done by Claude)

- Create/authenticate Supabase, Render, Vercel, Twilio, Stripe accounts.
- Generate + paste real secret values (`JWT_SECRET`, `ENCRYPTION_KEY`, …).
- Rotate any previously leaked keys.
- Buy/configure domain + DNS + TLS.
- Author ToS / Privacy Policy.
- Push/force-push to git (esp. `.env` history scrub).

---

## E. Live URLs (2026-07-16)

- Frontend: https://careme-snowy.vercel.app
- Backend:  https://careme-smzs.onrender.com
- DB: Supabase `lvotusljnaiirpvmhtdz` (pooler :6543 / direct :5432)
