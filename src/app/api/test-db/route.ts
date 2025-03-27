import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Intentar obtener estadísticas básicas
    const usersCount = await prisma.user.count();
    const storesCount = await prisma.store.count();
    const productsCount = await prisma.product.count();
    
    return NextResponse.json({
      success: true,
      message: "Conexión exitosa a la base de datos",
      stats: {
        usersCount,
        storesCount,
        productsCount
      },
      databaseUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada",
      // Ocultar la URL completa por seguridad, solo mostrar el tipo
      databaseType: process.env.DATABASE_URL?.split(":")[0] || "desconocido"
    });
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
    return NextResponse.json({
      success: false,
      message: "Error al conectar a la base de datos",
      error: String(error),
      databaseUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada",
      databaseType: process.env.DATABASE_URL?.split(":")[0] || "desconocido"
    }, { status: 500 });
  }
} 