import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

// Inicializar Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de la base de datos...");

  try {
    // 1. Crear usuario administrador
    const adminExists = await prisma.user.findFirst({
      where: { email: "admin@posweed.com" }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const admin = await prisma.user.create({
        data: {
          email: "admin@posweed.com",
          name: "Administrador",
          hashedPassword,
          role: "ADMIN" as UserRole,
        }
      });
      
      console.log("Usuario administrador creado:", admin.id);
    } else {
      console.log("El usuario administrador ya existe");
    }

    // 2. Crear una tienda de prueba
    const storeExists = await prisma.store.findFirst({
      where: { username: "tienda1" }
    });

    if (!storeExists) {
      const hashedPassword = await bcrypt.hash("tienda123", 10);
      
      // Crear un usuario asociado a la tienda
      const storeUser = await prisma.user.create({
        data: {
          email: "tienda1@posweed.com",
          name: "Tienda 1",
          hashedPassword,
          role: "STORE" as UserRole,
        }
      });
      
      // Crear la tienda
      const store = await prisma.store.create({
        data: {
          name: "Tienda Prueba",
          username: "tienda1",
          email: "tienda1@posweed.com",
          address: "Calle de Prueba 123",
          phone: "123456789",
          hashedPassword,
          userId: storeUser.id,
          image: "https://ui-avatars.com/api/?name=Tienda1",
          status: "ACTIVE"
        }
      });
      
      console.log("Tienda creada:", store.id);
    } else {
      console.log("La tienda ya existe");
    }

    console.log("Seed completado con éxito");
  } catch (error) {
    console.error("Error durante el seed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 