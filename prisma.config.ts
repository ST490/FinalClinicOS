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
// Docs: https://pris.ly/d/config-datasource
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  // Prisma 7 requires the CLI to reach the DB via an adapter too. In v7,
  // migrations/introspection work automatically with the driver adapter —
  // no extra migrations config needed.
  adapter: async () => {
    const { Pool } = await import('pg');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'prisma.config.ts: neither DIRECT_URL nor DATABASE_URL is set. ' +
          'Define one in your environment before running Prisma CLI commands.',
      );
    }
    const pool = new Pool({ connectionString: url });
    return new PrismaPg(pool);
  },
});

