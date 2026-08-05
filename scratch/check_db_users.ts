import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Connecting to:', url?.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkUsersWithRLS() {
  const basicUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isOrgOwner: true, orgId: true }
  });

  console.log(`Found ${basicUsers.length} users in DB. Testing loadUserWithRoles with GUCs:`);
  
  for (const u of basicUsers) {
    if (!u.email?.includes('kane') && !u.email?.includes('apexmedical')) continue;

    const fullUser = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true),
                set_config('app.current_org_id', $2, true),
                set_config('app.is_org_owner', $3, true)`,
        u.id,
        u.orgId || '',
        u.isOrgOwner ? 'true' : 'false',
      );

      return tx.user.findUnique({
        where: { id: u.id },
        include: {
          clinicRoles: {
            where: { status: 'ACTIVE' },
            include: { clinic: { select: { name: true } } }
          }
        }
      });
    });

    console.log(`- Email: ${u.email}, Name: ${u.name}, isOrgOwner: ${u.isOrgOwner}`);
    console.log(`  Roles with GUC:`, fullUser?.clinicRoles.map(cr => ({ clinic: cr.clinic.name, role: cr.role, status: cr.status })));
  }

  await prisma.$disconnect();
  await pool.end();
}

checkUsersWithRLS().catch(err => console.error(err));
