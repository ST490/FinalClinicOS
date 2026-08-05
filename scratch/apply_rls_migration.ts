import { Client } from 'pg';
import fs from 'fs';
import 'dotenv/config';

const url = process.env.SUPERUSER_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
console.log('Connecting to apply migration with:', url?.replace(/:[^:@]+@/, ':****@'));

const sql = fs.readFileSync('prisma/migrations/00011_rls_tenant_isolation/migration.sql', 'utf8');

const client = new Client({ connectionString: url });
await client.connect();

try {
  console.log('Executing 00011_rls_tenant_isolation/migration.sql...');
  await client.query(sql);
  console.log('Migration executed successfully!');
} catch (e: any) {
  console.error('Error applying migration:', e);
} finally {
  await client.end();
}
