
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);

  // Criar um administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@homefix.com' },
    update: {},
    create: {
      email: 'admin@homefix.com',
      password: await bcrypt.hash('admin123', salt),
      firstName: 'Admin',
      lastName: 'User',
      birthDate: new Date('1990-01-01'),
      isAdmin: true
    }
  });

  // Criar um técnico
  const technician = await prisma.user.upsert({
    where: { email: 'tecnico@homefix.com' },
    update: {},
    create: {
      email: 'tecnico@homefix.com',
      password: await bcrypt.hash('tecnico123', salt),
      firstName: 'Carlos',
      lastName: 'Técnico',
      birthDate: new Date('1985-05-15'),
      isTechnician: true
    }
  });

  // Criar um cliente
  const client = await prisma.user.upsert({
    where: { email: 'cliente@homefix.com' },
    update: {},
    create: {
      email: 'cliente@homefix.com',
      password: await bcrypt.hash('cliente123', salt),
      firstName: 'Ana',
      lastName: 'Cliente',
      birthDate: new Date('1995-09-20')
    }
  });

  console.log({ admin, technician, client });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
