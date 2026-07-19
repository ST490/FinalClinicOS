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

const ORG_NAME = 'Kane Medical Group';
const CLINIC_NAME = 'Kane Primary Care';
const COUNTRY = 'US';
const DEMO_PASSWORD = 'password@123';
const BCRYPT_ROUNDS = 12;

const DEMO_ROLES = [
  { role: 'MASTER',       email: 'kane@gmail.com',            name: 'Dr. Kane (Owner & Doctor)', isOrgOwner: true },
  { role: 'SUB_MASTER',   email: 'manager.kane@gmail.com',     name: 'Marcus Vance (Branch Manager)', isOrgOwner: false },
  { role: 'NURSE',        email: 'nurse.kane@gmail.com',       name: 'Sarah Jenkins (Lead Nurse)', isOrgOwner: false },
  { role: 'RECEPTIONIST', email: 'reception.kane@gmail.com',   name: 'Alex Rivera (Front Desk)', isOrgOwner: false },
  { role: 'PHARMACIST',   email: 'pharmacy.kane@gmail.com',    name: 'Emily Chen (Pharmacist)', isOrgOwner: false },
  { role: 'HR',           email: 'hr.kane@gmail.com',          name: 'David Miller (HR Director)', isOrgOwner: false },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1. Create Org
  const org = await prisma.organization.upsert({
    where: { id: 'a1234567-a123-a123-a123-a123456789ab' },
    update: { name: ORG_NAME },
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
    update: { name: CLINIC_NAME },
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

  // 3. Create Users for each Role
  for (const profile of DEMO_ROLES) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      update: { orgId: org.id, passwordHash, status: 'ACTIVE', isOrgOwner: profile.isOrgOwner },
      create: {
        email: profile.email,
        name: profile.name,
        passwordHash,
        orgId: org.id,
        status: 'ACTIVE',
        isOrgOwner: profile.isOrgOwner,
        twoFactorEnabled: false,
      },
    });

    if (profile.role !== 'MASTER') {
      await prisma.userClinicRole.upsert({
        where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
        update: { status: 'ACTIVE', role: profile.role as any, isPrimary: true },
        create: {
          userId: user.id,
          clinicId: clinic.id,
          role: profile.role as any,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
    }
  }

  const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'kane@gmail.com' } });

  // 4. Create Mock Patients
  const patientsData = [
    { name: 'John Doe', email: 'john@example.com', phone: '+1234567890', gender: Gender.MALE },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', gender: Gender.FEMALE },
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567892', gender: Gender.FEMALE },
    { name: 'Bob Brown', email: 'bob@example.com', phone: '+1234567893', gender: Gender.MALE },
    { name: 'Charlie Green', email: 'charlie@example.com', phone: '+1234567894', gender: Gender.MALE },
  ];

  const createdPatients = [];
  for (const p of patientsData) {
    const existing = await prisma.patient.findFirst({
      where: { clinicId: clinic.id, email: p.email }
    });
    if (existing) {
      createdPatients.push(existing);
    } else {
      const newP = await prisma.patient.create({
        data: {
          clinicId: clinic.id,
          orgId: org.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          gender: p.gender,
          createdById: ownerUser.id,
        },
      });
      createdPatients.push(newP);
    }
  }

  // 5. Create Patient Visits & Dues/Revenue
  for (let i = 0; i < createdPatients.length; i++) {
    const patient = createdPatients[i];
    const visit = await prisma.patientVisit.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        doctorId: ownerUser.id,
        createdById: ownerUser.id,
        chiefComplaint: i % 2 === 0 ? 'Routine Health Checkup' : 'Seasonal Allergy & Fever',
        diagnosis: i % 2 === 0 ? 'Healthy / Normal' : 'Mild Upper Respiratory Infection',
        status: 'COMPLETED',
      }
    });

    await prisma.due.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        totalAmount: 150.00,
        amountPaid: 150.00,
        amountDue: 0.00,
        status: 'PAID',
        recordedById: ownerUser.id,
      }
    });
  }

  // 6. Create Mock Appointments
  const now = new Date();
  for (let i = 0; i < createdPatients.length; i++) {
    const patient = createdPatients[i];
    const slotStart = new Date(now);
    slotStart.setHours(9 + i, 0, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(30);

    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        doctorId: ownerUser.id,
        slotStart,
        slotEnd,
        status: i === 0 ? 'COMPLETED' : i === 1 ? 'IN_PROGRESS' : 'BOOKED',
        createdById: ownerUser.id,
        category: i === 0 ? 'FIRST_TIME' : 'RETURNING',
        type: 'SCHEDULED'
      }
    });
  }

  // 7. Create Mock Inventory
  const inventoryItems = [
    { customName: 'Amoxicillin 500mg', quantity: 120, reorderThreshold: 20, unitPrice: 15.00, sellingPrice: 25.00 },
    { customName: 'Paracetamol 650mg', quantity: 8, reorderThreshold: 15, unitPrice: 2.00, sellingPrice: 5.00 },
    { customName: 'Surgical Gloves (Box)', quantity: 45, reorderThreshold: 10, unitPrice: 12.00, sellingPrice: 20.00 },
    { customName: 'Thermometer Digital', quantity: 4, reorderThreshold: 5, unitPrice: 8.00, sellingPrice: 15.00 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        customName: item.customName,
        quantity: item.quantity,
        reorderThreshold: item.reorderThreshold,
        unitPrice: item.unitPrice,
        sellingPrice: item.sellingPrice,
        createdById: ownerUser.id,
      }
    });
  }

  console.log('✔ All role demo accounts seeded successfully!');
  for (const profile of DEMO_ROLES) {
    console.log(`  ${profile.role.padEnd(12)} ${profile.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
