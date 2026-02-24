import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash('Admin123!@#', 10);
  await prisma.user.upsert({
    where: { email: 'admin@vytalwatch.ai' },
    update: {},
    create: {
      email: 'admin@vytalwatch.ai',
      passwordHash: pw,
      firstName: 'Admin',
      lastName: 'User',
      role: 'superadmin',
      status: 'active',
    },
  });
  console.log('Admin user created: admin@vytalwatch.ai / Admin123!@#');
}

main().catch(console.error).finally(() => prisma.$disconnect());
