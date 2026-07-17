// Prisma Client singleton
import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances during hot reload in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// RLS uses per-request interactive transactions + SET LOCAL. The Supabase
// pooler (DATABASE_URL, pgbouncer transaction mode) drops session state
// between statements, so it cannot carry SET LOCAL. Prefer DIRECT_URL
// (direct connection) for the transactional RLS client; fall back to
// DATABASE_URL only if DIRECT_URL is absent.
const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Interactive transactions let withTenant() run SET LOCAL in the same
    // transaction that carries the per-request RLS session variables.
    transactionOptions: { timeout: 10000, maxWait: 5000 },
  });

// In development, prevent Prisma Client from being garbage collected
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;