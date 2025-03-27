import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "",
      },
    },
  });

  try {
    console.log("🔍 Intentando conectar con la base de datos usando Prisma Accelerate...");
    console.log("URL de conexión (primeros 30 caracteres):", 
      process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.substring(0, 30) + "..." : 
      "No configurada");
    
    // Intentar consultas de prueba
    const userCount = await prisma.user.count();
    const storeCount = await prisma.store.count();
    
    return NextResponse.json({
      success: true,
      message: "✅ Conexión exitosa a Prisma Accelerate",
      counts: {
        users: userCount,
        stores: storeCount
      },
      dbUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada",
      protocol: process.env.DATABASE_URL?.split(":")[0] || "No disponible",
      serviceType: "Prisma Accelerate"
    });
  } catch (error) {
    console.error("❌ Error conectando a la base de datos:", error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      dbUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada", 
      protocol: process.env.DATABASE_URL?.split(":")[0] || "No disponible",
      hint: "Comprueba que la URL comienza con prisma+postgres:// y que el API key es válido",
      env: Object.keys(process.env).filter(key => key.includes("DATABASE") || key.includes("PRISMA") || key.includes("DB"))
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 