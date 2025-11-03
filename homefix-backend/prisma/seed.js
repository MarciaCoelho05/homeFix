const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Senhas: admin123, tecnico123, cliente123
const ADMIN_HASH = "$2b$10$l.15j6SnBGyqjfl7twS1fuCiuyODtPHrJFVpf8jUBureunYfLo65e";
const TECH_HASH = "$2b$10$f0SZbv6ZkPNH0aZHr3mCj.D8q//5/lcmsqxvmIMfgP3kShjXfW61C";
const CLIENT_HASH = "$2b$10$Puf5sSFo5eBFKfHY968QU.Y.kqxfySQaNHVeaZHy7yaMRW6LXkmgu";

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@homefix.com" },
    update: {
      password: ADMIN_HASH,
      firstName: "Admin",
      lastName: "User",
      birthDate: new Date("1990-01-01"),
      isAdmin: true,
      isTechnician: false,
    },
    create: {
      email: "admin@homefix.com",
      password: ADMIN_HASH,
      firstName: "Admin",
      lastName: "User",
      birthDate: new Date("1990-01-01"),
      isAdmin: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "tecnico@homefix.com" },
    update: {
      password: TECH_HASH,
      firstName: "Carlos",
      lastName: "Tecnico",
      birthDate: new Date("1985-05-15"),
      isAdmin: false,
      isTechnician: true,
      technicianCategory: "Canalização",
    },
    create: {
      email: "tecnico@homefix.com",
      password: TECH_HASH,
      firstName: "Carlos",
      lastName: "Tecnico",
      birthDate: new Date("1985-05-15"),
      isTechnician: true,
      technicianCategory: "Canalização",
    },
  });

  await prisma.user.upsert({
    where: { email: "cliente@homefix.com" },
    update: {
      password: CLIENT_HASH,
      firstName: "Ana",
      lastName: "Cliente",
      birthDate: new Date("1995-09-20"),
      isAdmin: false,
      isTechnician: false,
    },
    create: {
      email: "cliente@homefix.com",
      password: CLIENT_HASH,
      firstName: "Ana",
      lastName: "Cliente",
      birthDate: new Date("1995-09-20"),
    },
  });

  console.log("Seed concluido: utilizadores base criados.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Erro ao executar seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
