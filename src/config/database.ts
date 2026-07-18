// Prisma Client singleton.
//
// Prisma 7 requires a driver adapter — `new PrismaClient()` with no adapter
// throws. We build a `pg` Pool and hand it to `PrismaPg`.
//
// Which URL the adapter uses matters for RLS:
//   RLS uses per-request interactive transactions + SET LOCAL. The Supabase
//   pooler behind DATABASE_URL (pgbouncer, transaction mode) drops session
//   state between statements, so it cannot carry SET LOCAL. We therefore wire
//   the Pool to DIRECT_URL (direct/session-mode connection) and only fall back
//   to DATABASE_URL when DIRECT_URL is absent (e.g. local Postgres with no
//   pooler). This preserves the tenant-isolation design from tenant-session.ts.
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances during hot reload in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

function createPrismaClient(): PrismaClient {
  if (!datasourceUrl) {
    throw new Error(
      'database.ts: neither DIRECT_URL nor DATABASE_URL is set. ' +
        'The Prisma 7 driver adapter needs a connection string.',
    );
  }
  const pool = new Pool({ connectionString: datasourceUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Interactive transactions let withTenant() run SET LOCAL in the same
    // transaction that carries the per-request RLS session variables.
    transactionOptions: { timeout: 10000, maxWait: 5000 },
  });
}

export const prisma = global.prisma || createPrismaClient();

// In development, prevent Prisma Client from being garbage collected
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
