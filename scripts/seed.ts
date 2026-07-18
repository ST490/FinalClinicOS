/**
 * Careme dev seed — creates one org + clinic + every role for end-to-end testing.
 *
 * Run with:  npm run db:seed
 *
 * Idempotent: skips users that already exist. Drop the DB to fully reset.
 *
 * ponytail: one file, ~100 lines, mirrors src/auth/auth.service.ts behaviour
 * so seed accounts log in identically to a user registered through the API.
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

// Prisma 7 requires a driver adapter. Seed runs outside the app, so it gets its
// own Pool wired to DIRECT_URL (session mode) — same reasoning as database.ts.
const seedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!seedUrl) {
  throw new Error('seed.ts: set DIRECT_URL (or DATABASE_URL) before running db:seed');
}
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: seedUrl })) });

const ORG_NAME = 'Apex Medical Group';
const CLINIC_NAME = 'Apex Hebbal';
const COUNTRY = 'IN';
const DEFAULT_PASSWORD = 'password123';

// Mirror src/auth/utils/password.service.ts (12 rounds). Keep in sync if that changes.
const BCRYPT_ROUNDS = 12;

const ROLE_PROFILES = [
  { role: 'MASTER',       email: 'master@apexmedical.com',    phone: '+919000000001', name: 'Dr. Aris Thorne',     isPrimary: true  },
  { role: 'SUB_MASTER',   email: 'submaster@apexmedical.com', phone: '+919000000002', name: 'Dr. Emily Chen',     isPrimary: true  },
  { role: 'DOCTOR',       email: 'doctor@apexmedical.com',    phone: '+919000000003', name: 'Dr. Eleanor Vance',  isPrimary: true  },
  { role: 'NURSE',        email: 'nurse@apexmedical.com',     phone: '+919000000004', name: 'Nurse Sarah L.',     isPrimary: true  },
  { role: 'PHARMACIST',   email: 'pharmacist@apexmedical.com',phone: '+919000000005', name: 'Dr. Evelyn Reed',    isPrimary: true  },
  { role: 'RECEPTIONIST', email: 'receptionist@apexmedical.com',phone: '+919000000006', name: 'Sarah J.',         isPrimary: true  },
  { role: 'HR',           email: 'hr@apexmedical.com',        phone: '+919000000007', name: 'Sarah Jenkins',      isPrimary: true  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  // ── Org + clinic ────────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
    update: {},
    create: {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      name: ORG_NAME,
      country: COUNTRY,
      status: 'ACTIVE',
      plan: 'basic',
    },
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed' },
    update: {},
    create: {
      id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
      orgId: org.id,
      name: CLINIC_NAME,
      country: COUNTRY,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      locale: 'en-IN',
      status: 'ACTIVE',
      accentColor: '#0ea5e9',
    },
  });

  // ── Users + clinic roles ────────────────────────────────────────────────────
  for (const profile of ROLE_PROFILES) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { status: 'ACTIVE', passwordHash, name: profile.name, isOrgOwner: profile.role === 'MASTER' },
      create: {
        email: profile.email,
        phone: profile.phone,
        name: profile.name,
        passwordHash,
        orgId: org.id,
        status: 'ACTIVE',
        isOrgOwner: profile.role === 'MASTER',
        // Mark master seeded so 2FA enforcement doesn't lock us out of dev.
        twoFactorEnabled: profile.role === 'MASTER' ? false : false,
      },
    });

    // Master doesn't get a clinic role — they are org-scoped via isOrgOwner.
    if (profile.role !== 'MASTER') {
      await prisma.userClinicRole.upsert({
        where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
        update: { status: 'ACTIVE', role: profile.role as any, isPrimary: profile.isPrimary },
        create: {
          userId: user.id,
          clinicId: clinic.id,
          role: profile.role as any,
          isPrimary: profile.isPrimary,
          status: 'ACTIVE',
        },
      });
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n✔ Seed complete.\n');
  console.log( `  org:    ${org.name} (${org.id})`);
  console.log( `  clinic: ${clinic.name} (${clinic.id})`);
  console.log(`  users:  ${ROLE_PROFILES.length} (all password: ${DEFAULT_PASSWORD})\n`);
  for (const p of ROLE_PROFILES) {
    console.log(`    ${p.role.padEnd(12)} ${p.email}`);
  }
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
