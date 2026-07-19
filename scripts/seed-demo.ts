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
const DEMO_EMAIL = 'kane@gmail.com';
const DEMO_PASSWORD = 'password@123';
const BCRYPT_ROUNDS = 12;

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

  // 3. Create User
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { orgId: org.id, passwordHash, status: 'ACTIVE', isOrgOwner: true },
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

  // 4. Create Staff Members
  const staffMembers = [
    { name: 'Sarah Nurse', email: 'nurse.kane@gmail.com', role: 'NURSE' as const },
    { name: 'Alex Frontdesk', email: 'reception.kane@gmail.com', role: 'RECEPTIONIST' as const },
  ];

  for (const s of staffMembers) {
    const st = await prisma.user.upsert({
      where: { email: s.email },
      update: { status: 'ACTIVE' },
      create: {
        email: s.email,
        name: s.name,
        passwordHash,
        orgId: org.id,
        status: 'ACTIVE',
      },
    });

    await prisma.userClinicRole.upsert({
      where: { userId_clinicId: { userId: st.id, clinicId: clinic.id } },
      update: { status: 'ACTIVE', role: s.role, isPrimary: true },
      create: {
        userId: st.id,
        clinicId: clinic.id,
        role: s.role,
        isPrimary: true,
        status: 'ACTIVE',
      },
    });
  }

  // 5. Create Mock Patients
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
          createdById: user.id,
        },
      });
      createdPatients.push(newP);
    }
  }

  // 6. Create Patient Visits & Dues/Revenue
  for (let i = 0; i < createdPatients.length; i++) {
    const patient = createdPatients[i];
    const visit = await prisma.patientVisit.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        doctorId: user.id,
        createdById: user.id,
        chiefComplaint: i % 2 === 0 ? 'Routine Health Checkup' : 'Seasonal Allergy & Fever',
        diagnosis: i % 2 === 0 ? 'Healthy / Normal' : 'Mild Upper Respiratory Infection',
        status: 'COMPLETED',
      }
    });

    // Create Dues for Revenue calculation
    await prisma.due.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        totalAmount: 150.00,
        amountPaid: 150.00,
        amountDue: 0.00,
        status: 'PAID',
        recordedById: user.id,
      }
    });
  }

  // 7. Create Mock Appointments
  const now = new Date();
  for (let i = 0; i < createdPatients.length; i++) {
    const patient = createdPatients[i];
    const slotStart = new Date(now);
    slotStart.setHours(9 + i, 0, 0, 0); // Today's appointments at 9am, 10am, 11am...
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(30);

    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        orgId: org.id,
        patientId: patient.id,
        doctorId: user.id,
        slotStart,
        slotEnd,
        status: i === 0 ? 'COMPLETED' : i === 1 ? 'IN_PROGRESS' : 'BOOKED',
        createdById: user.id,
        category: i === 0 ? 'FIRST_TIME' : 'RETURNING',
        type: 'SCHEDULED'
      }
    });
  }

  // 8. Create Mock Inventory
  const inventoryItems = [
    { customName: 'Amoxicillin 500mg', quantity: 120, reorderThreshold: 20, unitPrice: 15.00, sellingPrice: 25.00 },
    { customName: 'Paracetamol 650mg', quantity: 8, reorderThreshold: 15, unitPrice: 2.00, sellingPrice: 5.00 }, // Low stock!
    { customName: 'Surgical Gloves (Box)', quantity: 45, reorderThreshold: 10, unitPrice: 12.00, sellingPrice: 20.00 },
    { customName: 'Thermometer Digital', quantity: 4, reorderThreshold: 5, unitPrice: 8.00, sellingPrice: 15.00 }, // Low stock!
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
        createdById: user.id,
      }
    });
  }

  console.log('✔ Rich Demo account seeded successfully!');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
