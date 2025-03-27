import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcrypt";

// Inicializar Prisma Client
const prisma = new PrismaClient();

async function main() {
  try {
    // Datos del administrador
    const adminEmail = "admin@posweed.com";
    const adminPassword = "Admin123!";
    const hashedPassword = await hash(adminPassword, 12);

    // Verificar si ya existe un usuario con este email
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      console.log("El usuario administrador ya existe");
      return;
    }

    // Crear usuario administrador
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Administrador",
        hashedPassword,
        role: UserRole.ADMIN,
        image: "https://ui-avatars.com/api/?name=Admin&background=random"
      }
    });

    console.log("Usuario administrador creado con éxito:", admin);
  } catch (error) {
    console.error("Error al crear el usuario administrador:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 