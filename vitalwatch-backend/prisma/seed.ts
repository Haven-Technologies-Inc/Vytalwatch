import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'User';

  if (!adminEmail || !adminPassword) {
    console.log(
      'Skipping admin seed: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.',
    );
    console.log('Set these in your .env file to bootstrap an admin user.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      status: 'active',
      emailVerified: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'superadmin',
      status: 'active',
      emailVerified: true,
    },
  });

  console.log(`Admin user created/verified: ${adminEmail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
