import { PrismaClient, UserRole, StoreStatus } from "@prisma/client";
import { hash } from "bcrypt";

// Inicializar Prisma Client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🌱 Iniciando proceso de seeding...");
    
    // Datos del administrador
    const adminEmail = "admin@posweed.com";
    const adminPassword = "Admin123!";
    console.log("🔑 Hasheando contraseña del administrador...");
    const hashedAdminPassword = await hash(adminPassword, 12);
    console.log("💾 Hash generado:", hashedAdminPassword.substring(0, 20) + "...");

    // Verificar si ya existe un usuario con este email
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    let adminUser;
    
    if (existingAdmin) {
      console.log("👤 El usuario administrador ya existe:", existingAdmin.id);
      adminUser = existingAdmin;
    } else {
      // Crear usuario administrador
      console.log("👤 Creando usuario administrador...");
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Administrador",
          hashedPassword: hashedAdminPassword,
          role: UserRole.ADMIN,
          image: "https://ui-avatars.com/api/?name=Admin&background=random"
        }
      });

      console.log("✅ Usuario administrador creado con éxito:", adminUser);
    }
    
    // Datos de tienda de prueba
    const storeUsername = "tienda1";
    const storePassword = "Tienda123!";
    console.log("🔑 Hasheando contraseña de tienda...");
    const hashedStorePassword = await hash(storePassword, 12);
    console.log("💾 Hash generado para tienda:", hashedStorePassword.substring(0, 20) + "...");
    
    // Limpiar cualquier tienda existente con este username para evitar conflictos
    console.log("🧹 Verificando si ya existe la tienda...");
    const existingStore = await prisma.store.findUnique({
      where: { username: storeUsername }
    });
    
    if (existingStore) {
      console.log("🗑️ Eliminando tienda existente:", existingStore.id);
      await prisma.store.delete({
        where: { id: existingStore.id }
      });
      console.log("✅ Tienda eliminada con éxito");
    }
    
    // Crear tienda de prueba
    console.log("🏪 Creando tienda de prueba...");
    const store = await prisma.store.create({
      data: {
        name: "Tienda Prueba",
        username: storeUsername,
        hashedPassword: hashedStorePassword,
        status: StoreStatus.ACTIVE,
        address: "Calle de Prueba 123",
        phone: "123456789",
        email: "tienda@example.com",
        image: "https://ui-avatars.com/api/?name=Tienda1&background=green",
        user: {
          connect: { id: adminUser.id } // Conectar con el usuario administrador
        }
      }
    });
    
    console.log("✅ Tienda de prueba creada con éxito:", {
      id: store.id,
      name: store.name,
      username: store.username,
      userId: store.userId,
      hashedPassword: store.hashedPassword.substring(0, 20) + "..."
    });
    
    // Verificamos que se haya creado correctamente
    const verifyStore = await prisma.store.findUnique({
      where: { id: store.id },
      include: { user: true }
    });
    
    if (verifyStore && verifyStore.user) {
      console.log("✅ Verificación de tienda exitosa:", {
        id: verifyStore.id,
        username: verifyStore.username,
        userId: verifyStore.userId,
        userName: verifyStore.user.name
      });
    } else {
      console.error("❌ Error: No se pudo verificar la tienda creada");
    }
    
    console.log("🎉 Proceso de seeding completado con éxito");
  } catch (error) {
    console.error("❌ Error al crear datos iniciales:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 