import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  try {
    console.log("\n====== INSPECCIÓN DE BASE DE DATOS ======\n");
    
    // Usuarios
    const users = await prisma.user.findMany();
    console.log(`👥 USUARIOS (${users.length}):`);
    users.forEach(user => {
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Nombre: ${user.name || 'N/A'}`);
      console.log(`  Rol: ${user.role}`);
      console.log(`  Contraseña hasheada: ${user.hashedPassword ? '✓ Presente' : '✗ Ausente'}`);
      console.log(`  ---`);
    });
    
    // Tiendas
    const stores = await prisma.store.findMany({
      include: { user: true }
    });
    console.log(`\n🏪 TIENDAS (${stores.length}):`);
    stores.forEach(store => {
      console.log(`  ID: ${store.id}`);
      console.log(`  Nombre: ${store.name}`);
      console.log(`  Username: ${store.username}`);
      console.log(`  Email: ${store.email || 'N/A'}`);
      console.log(`  Estado: ${store.status}`);
      console.log(`  Usuario asociado: ${store.userId ? `✓ (${store.user?.name || store.user?.email})` : '✗ No asociado'}`);
      console.log(`  Contraseña hasheada: ${store.hashedPassword ? '✓ Presente' : '✗ Ausente'}`);
      console.log(`  ---`);
    });
    
    // Productos
    const productCount = await prisma.product.count();
    console.log(`\n📦 PRODUCTOS: ${productCount}`);
    
    // Categorías
    const categoryCount = await prisma.category.count();
    console.log(`\n🏷️ CATEGORÍAS: ${categoryCount}`);
    
    // Ventas
    const saleCount = await prisma.sale.count();
    console.log(`\n💰 VENTAS: ${saleCount}`);
    
    // Inventario
    const inventoryCount = await prisma.inventoryItem.count();
    console.log(`\n📊 ELEMENTOS DE INVENTARIO: ${inventoryCount}`);
    
    console.log("\n====== FIN DE INSPECCIÓN ======\n");
  } catch (error) {
    console.error("❌ Error al inspeccionar la base de datos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase(); 