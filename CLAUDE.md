Stack: Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis
Architecture: Modular monolith
Auth: JWT + refresh tokens with bcrypt @12, Redis rate limiting
Multi-tenancy: every table has clinic_id, org_id
Naming: camelCase variables, snake_case DB columns
No microservices. No over-engineering.
Current phase: All 3 modules complete — Patients, Appointments, Inventory built, TypeScript compiles cleanly