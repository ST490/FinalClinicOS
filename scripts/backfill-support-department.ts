/**
 * One-off backfill: SUPPORT staff created before the `department` field was
 * wired had `user_clinic_roles.department` left NULL (the old directAddSchema
 * stripped it). This sets a default department for any SUPPORT role that still
 * has none, so the Staff Directory / Role Assignments show a value instead of "—".
 *
 * Run with:  npx tsx scripts/backfill-support-department.ts
 *
 * Safe to re-run: only touches rows where department IS NULL.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Prisma 7 requires a driver adapter. DIRECT_URL = session-mode pooler (safe
// for one-off write scripts); fall back to DATABASE_URL if unset.
const backfillUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!backfillUrl) {
  throw new Error('backfill-support-department.ts: set DIRECT_URL (or DATABASE_URL) before running');
}
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: backfillUrl })) });
const DEFAULT_DEPARTMENT = 'Production';

async function main() {
  const affected = await prisma.userClinicRole.updateMany({
    where: { role: 'SUPPORT', department: null },
    data: { department: DEFAULT_DEPARTMENT },
  });
  console.log(`Backfilled department="${DEFAULT_DEPARTMENT}" on ${affected.count} SUPPORT role(s) with null department.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
