import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testAuthentication() {
  console.log("\n==== PRUEBA DE AUTENTICACIÓN ====\n");
  
  try {
    // 1. Probar autenticación admin
    const adminEmail = 'admin@posweed.com';
    const adminPassword = 'Admin123!';
    
    console.log(`👑 Probando autenticación de Admin (${adminEmail})...`);
    
    const admin = await prisma.user.findFirst({
      where: { email: adminEmail }
    });
    
    if (!admin) {
      console.log("❌ Admin no encontrado en la base de datos");
    } else {
      console.log(`✅ Admin encontrado: ${admin.name || admin.email}`);
      console.log(`- ID: ${admin.id}`);
      console.log(`- Rol: ${admin.role}`);
      
      if (!admin.hashedPassword) {
        console.log("❌ Admin no tiene contraseña configurada");
      } else {
        const isAdminPasswordValid = await bcrypt.compare(adminPassword, admin.hashedPassword);
        console.log(`- Contraseña válida: ${isAdminPasswordValid ? '✅ Sí' : '❌ No'}`);
      }
    }
    
    // 2. Listar todas las tiendas para probar
    console.log("\n🏪 Listando todas las tiendas disponibles...");
    
    const stores = await prisma.store.findMany({
      include: {
        user: true
      }
    });
    
    if (stores.length === 0) {
      console.log("❌ No hay tiendas registradas en la base de datos");
    } else {
      console.log(`✅ Se encontraron ${stores.length} tiendas:`);
      
      for (const store of stores) {
        console.log(`\n🏪 Tienda: ${store.name}`);
        console.log(`- ID: ${store.id}`);
        console.log(`- Username: ${store.username}`);
        console.log(`- Estado: ${store.status}`);
        console.log(`- Usuario asociado: ${store.userId ? `✅ (${store.user?.email})` : '❌ No'}`);
        
        if (!store.hashedPassword) {
          console.log("❌ La tienda no tiene contraseña configurada");
        } else {
          // Prueba con la contraseña Admin123! (asumiendo que podría ser la misma)
          const testPassword = 'Admin123!';
          const isStorePasswordValid = await bcrypt.compare(testPassword, store.hashedPassword);
          console.log(`- Prueba con contraseña '${testPassword}': ${isStorePasswordValid ? '✅ Válida' : '❌ Inválida'}`);
        }
      }
    }
    
    console.log("\n==== SUGERENCIAS PARA LOGIN ====");
    console.log("👑 ADMIN:");
    console.log(`- Email: ${adminEmail}`);
    console.log(`- Contraseña: ${adminPassword}`);
    
    console.log("\n🏪 TIENDA:");
    if (stores.length > 0) {
      const firstStore = stores[0];
      console.log(`- Username: ${firstStore.username}`);
      console.log(`- Contraseña: Intenta con 'Admin123!' o contacta al administrador`);
    } else {
      console.log("- No hay tiendas disponibles para probar");
    }
    
  } catch (error) {
    console.error("💥 Error durante la prueba:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\n==== PRUEBA FINALIZADA ====\n");
  }
}

testAuthentication(); 