import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Gender } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const seedUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!seedUrl) {
  throw new Error('seed-demo.ts: set DIRECT_URL (or DATABASE_URL) before running');
}
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: seedUrl })) });

const ORG_NAME = 'Kane Clinics';
const CLINIC_NAME = 'Kane Primary Care';
const COUNTRY = 'US';
const DEMO_EMAIL = 'kane@gmail.com';
const DEMO_PASSWORD = 'password@123';
const BCRYPT_ROUNDS = 12;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1. Create Org
  const org = await prisma.organization.upsert({
    where: { id: 'a1234567-a123-a123-a123-a123456789ab' },
    update: {},
    create: {
      id: 'a1234567-a123-a123-a123-a123456789ab',
      name: ORG_NAME,
      country: COUNTRY,
      status: 'ACTIVE',
      plan: 'pro',
    },
  });

  // 2. Create Clinic
  const clinic = await prisma.clinic.upsert({
    where: { id: 'b1234567-b123-b123-b123-b123456789ab' },
    update: {},
    create: {
      id: 'b1234567-b123-b123-b123-b123456789ab',
      orgId: org.id,
      name: CLINIC_NAME,
      country: COUNTRY,
      timezone: 'America/New_York',
      currency: 'USD',
      locale: 'en-US',
      status: 'ACTIVE',
      accentColor: '#10b981',
    },
  });

  // 3. Create User
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, status: 'ACTIVE', isOrgOwner: true },
    create: {
      email: DEMO_EMAIL,
      name: 'Dr. Kane',
      passwordHash,
      orgId: org.id,
      status: 'ACTIVE',
      isOrgOwner: true,
      twoFactorEnabled: false,
    },
  });

  // Create DOCTOR role for this clinic
  await prisma.userClinicRole.upsert({
    where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
    update: { status: 'ACTIVE', role: 'DOCTOR', isPrimary: true },
    create: {
      userId: user.id,
      clinicId: clinic.id,
      role: 'DOCTOR',
      isPrimary: true,
      status: 'ACTIVE',
    },
  });

  // 4. Create Mock Patients
  const patientsData = [
    { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', gender: Gender.MALE },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', gender: Gender.FEMALE },
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567892', gender: Gender.FEMALE },
    { name: 'Bob Brown', email: 'bob@example.com', phone: '+1234567893', gender: Gender.MALE },
  ];

  for (const p of patientsData) {
    await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        gender: p.gender,
        createdById: user.id,
      },
    });
  }

  // 5. Create Mock Appointments
  const patients = await prisma.patient.findMany({ where: { clinicId: clinic.id } });
  
  const now = new Date();
  let dayOffset = 0;
  for (const patient of patients) {
    const slotStart = new Date(now);
    slotStart.setDate(slotStart.getDate() + dayOffset);
    slotStart.setHours(10, 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(10, 30, 0, 0);

    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        doctorId: user.id,
        slotStart,
        slotEnd,
        status: dayOffset === 0 ? 'BOOKED' : 'CONFIRMED',
        createdById: user.id,
        category: 'RETURNING',
        type: 'SCHEDULED'
      }
    });
    dayOffset++;
  }

  console.log('✔ Demo account seeded.');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
