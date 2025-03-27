import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      config: {
        databaseUrl: process.env.DATABASE_URL ? "Configurada" : "No configurada",
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? "Configurado" : "No configurado",
        nextAuthUrl: process.env.NEXTAUTH_URL || "No configurado",
        // Comprueba si la URL de la base de datos comienza correctamente
        databaseType: process.env.DATABASE_URL?.startsWith("prisma+postgres") ? "Correcto" : "Incorrecto"
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
} 