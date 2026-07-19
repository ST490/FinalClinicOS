// Prisma 7 configuration.
//
// Prisma 7 moved connection URLs out of schema.prisma into this file. The
// `datasource` block in schema.prisma now only declares `provider`.
//
// IMPORTANT — why the adapter is wired to DIRECT_URL, not DATABASE_URL:
//   DATABASE_URL  → Supabase pooler, transaction mode (pgbouncer, port 6543).
//                   Fine for the app, but PgBouncer drops session state between
//                   statements, which breaks `prisma migrate` / `prisma db push`
//                   and would also break the runtime RLS SET LOCAL flow.
//   DIRECT_URL    → Supabase pooler, session mode (port 5432). Safe for both
//                   the CLI (migrations/introspection) and for RLS.
//   This mirrors the old schema's `directUrl` behaviour. The runtime client in
//   src/config/database.ts wires its own adapter to DIRECT_URL for the same
//   reason — see the comment there.
//
//   SUPERUSER_URL → postgres superuser (session mode). Preferred here so the
//                   RLS migration (which creates policies + GRANTs) and future
//                   DDL run with full privileges, not the constrained
//                   `careme_app` role the app uses at runtime.
//
// Docs: https://pris.ly/d/config-datasource
import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Resolve the DB connection URL with a lazy fallback chain.
// IMPORTANT: use Prisma's `env()` helper (not `process.env.X` directly).
// `process.env.X` evaluates eagerly at module-load — too early in the
// Prisma 7 CLI bootstrap on hosts like Render, where env vars are injected
// into the process after the config module is first imported. That ordering
// made `datasource.url` resolve to undefined and made `prisma migrate deploy`
// fail with "The datasource.url property is required" even though all three
// vars were present at runtime. `env()` is resolved lazily by the CLI, so it
// reads the value at the right moment regardless of host.
const dbUrl = () => env('SUPERUSER_URL') || env('DIRECT_URL') || env('DATABASE_URL');

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  // Prisma 7 requires the datasource URL declared here for `prisma migrate`
  // (the `adapter()` below is only for the client/runtime). Prefer
  // SUPERUSER_URL so migration DDL + policy GRANTs run with full privileges
  // (the constrained careme_app role can't create policies). Falls back to
  // DIRECT_URL (session mode) then DATABASE_URL.
  datasource: { url: dbUrl() },
  migrations: { path: path.join('prisma', 'migrations') },
  // Prisma 7 requires the CLI to reach the DB via an adapter too. In v7,
  // migrations/introspection work automatically with the driver adapter —
  // no extra migrations config needed.
  adapter: async () => {
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const url = dbUrl();
    if (!url) {
      throw new Error(
        'prisma.config.ts: SUPERUSER_URL / DIRECT_URL / DATABASE_URL are all unset. ' +
          'Define at least one (SUPERUSER_URL preferred) before running Prisma CLI commands.',
      );
    }
    const pool = new Pool({ connectionString: url });
    return new PrismaPg(pool);
  },
});

