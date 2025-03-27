import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { UserRole } from "@prisma/client";

/**
 * Endpoint para permitir a administradores acceder a una tienda sin necesidad de contraseña
 * Esto funciona como un "acceso maestro" para administradores
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[Admin-Store-Access] Iniciando proceso de acceso maestro");
    
    // Verificar autenticación y que sea administrador
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[Admin-Store-Access] No hay token de sesión");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    let adminUserId;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string };
      
      if (!payload || payload.role !== "ADMIN") {
        console.log("[Admin-Store-Access] Usuario no es administrador:", payload?.role);
        return NextResponse.json({ error: "Se requieren permisos de administrador" }, { status: 403 });
      }
      
      adminUserId = payload.id;
      console.log("[Admin-Store-Access] Administrador verificado:", adminUserId);
    } catch (error) {
      console.error("[Admin-Store-Access] Error al verificar JWT:", error);
      return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
    }
    
    // Obtener datos de la tienda
    const body = await req.json();
    const { storeId } = body;
    
    if (!storeId) {
      console.log("[Admin-Store-Access] ID de tienda no proporcionado");
      return NextResponse.json({ error: "ID de tienda no proporcionado" }, { status: 400 });
    }
    
    console.log("[Admin-Store-Access] Buscando tienda:", storeId);
    
    // Obtener la tienda y verificar que esté activa
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (!store) {
      console.log("[Admin-Store-Access] Tienda no encontrada:", storeId);
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    
    if (store.status !== "ACTIVE") {
      console.log("[Admin-Store-Access] Tienda no está activa:", store.status);
      return NextResponse.json({ error: "La tienda no está activa" }, { status: 400 });
    }
    
    console.log("[Admin-Store-Access] Tienda encontrada:", {
      name: store.name,
      username: store.username,
      userId: store.userId
    });
    
    // Verificar que el usuario exista
    if (!store.user) {
      console.log("[Admin-Store-Access] La tienda no tiene usuario asociado");
      return NextResponse.json({ error: "La tienda no tiene usuario asociado" }, { status: 500 });
    }
    
    // Generar token especial con información del admin y la tienda
    const tokenData = {
      id: store.user.id,
      name: store.user.name,
      email: store.user.email,
      role: store.user.role,
      storeId: store.id,
      storeName: store.name,
      storeUsername: store.username,
      adminAccess: true, // Marcar que es un acceso de administrador
      adminId: adminUserId
    };
    
    console.log("[Admin-Store-Access] Generando token para acceso a tienda");
    
    const jwtToken = sign(
      tokenData,
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "4h" } // Tiempo de expiración reducido para accesos maestros
    );
    
    // Crear respuesta exitosa con el token
    const response = NextResponse.json({
      success: true,
      message: "Acceso maestro a tienda exitoso",
      token: jwtToken,
      user: tokenData,
      redirectUrl: "/dashboard"
    });
    
    // Configurar las cookies
    response.cookies.set({
      name: "session_token",
      value: jwtToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4, // 4 horas en segundos
      path: "/"
    });
    
    // Configurar cookie de respaldo
    response.cookies.set({
      name: "auth_token",
      value: jwtToken,
      httpOnly: false, // Accesible por JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4, // 4 horas
      path: "/"
    });
    
    console.log("[Admin-Store-Access] Acceso maestro completado exitosamente");
    
    return response;
    
  } catch (error) {
    console.error("[Admin-Store-Access] Error en acceso maestro:", error);
    return NextResponse.json({ error: "Error al procesar el acceso de administrador" }, { status: 500 });
  }
} 