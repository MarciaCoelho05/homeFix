const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const tecnicoHash = await bcrypt.hash("tecnico123", 10);
  const clienteHash = await bcrypt.hash("cliente123", 10);

  const adminBirthDate = new Date("1990-01-01");
  const tecnicoBirthDate = new Date("1985-05-15");
  const clienteBirthDate = new Date("1995-09-20");

  await prisma.user.upsert({
    where: { email: "admin@homefix.com" },
    update: {
      password: adminHash,
      firstName: "Admin",
      lastName: "User",
      birthDate: adminBirthDate,
      isAdmin: true,
      isTechnician: false,
      technicianCategory: [],
    },
    create: {
      email: "admin@homefix.com",
      password: adminHash,
      firstName: "Admin",
      lastName: "User",
      birthDate: adminBirthDate,
      isAdmin: true,
      isTechnician: false,
      technicianCategory: [],
    },
  });

  await prisma.user.upsert({
    where: { email: "tecnico@homefix.com" },
    update: {
      password: tecnicoHash,
      firstName: "Carlos",
      lastName: "Tecnico",
      birthDate: tecnicoBirthDate,
      isAdmin: false,
      isTechnician: true,
      technicianCategory: ["Canalização", "Eletricidade"],
    },
    create: {
      email: "tecnico@homefix.com",
      password: tecnicoHash,
      firstName: "Carlos",
      lastName: "Tecnico",
      birthDate: tecnicoBirthDate,
      isAdmin: false,
      isTechnician: true,
      technicianCategory: ["Canalização", "Eletricidade"],
    },
  });

  await prisma.user.upsert({
    where: { email: "cliente@homefix.com" },
    update: {
      password: clienteHash,
      firstName: "Ana",
      lastName: "Cliente",
      birthDate: clienteBirthDate,
      isAdmin: false,
      isTechnician: false,
      technicianCategory: [],
    },
    create: {
      email: "cliente@homefix.com",
      password: clienteHash,
      firstName: "Ana",
      lastName: "Cliente",
      birthDate: clienteBirthDate,
      isAdmin: false,
      isTechnician: false,
      technicianCategory: [],
    },
  });

  console.log("✅ Seed concluído: utilizadores pré-definidos criados:");
  console.log("   - admin@homefix.com / admin123 (Admin)");
  console.log("   - tecnico@homefix.com / tecnico123 (Técnico)");
  console.log("   - cliente@homefix.com / cliente123 (Cliente)");
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
