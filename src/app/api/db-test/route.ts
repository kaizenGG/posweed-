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
    console.log("🔍 Intentando conectar con la base de datos...");
    console.log("URL de conexión:", process.env.DATABASE_URL?.substring(0, 15) + "...");
    
    // Intentar una consulta sencilla
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      message: "Conexión exitosa a la base de datos",
      userCount,
      dbUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada",
      protocol: process.env.DATABASE_URL?.split(":")[0] || "No disponible"
    });
  } catch (error) {
    console.error("Error conectando a la base de datos:", error);
    
    return NextResponse.json({
      success: false,
      error: String(error),
      dbUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada", 
      protocol: process.env.DATABASE_URL?.split(":")[0] || "No disponible",
      env: Object.keys(process.env).filter(key => key.includes("DATABASE") || key.includes("PRISMA") || key.includes("DB"))
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 