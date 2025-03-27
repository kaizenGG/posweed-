import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    // Obtener datos del body
    const body = await req.json().catch(err => {
      console.error("[API Verify] Error al parsear el body:", err);
      return {};
    });
    
    const { token } = body;
    
    if (!token) {
      console.log("[API Verify] No se proporcionó un token");
      return NextResponse.json(
        { message: "No se proporcionó un token" },
        { status: 400 }
      );
    }
    
    // Verificación básica del token
    try {
      console.log("[API Verify] Verificando token...");
      
      const decodedToken: any = verify(
        token,
        process.env.NEXTAUTH_SECRET || "fallback-secret"
      );
      
      console.log("[API Verify] Token válido para ID de usuario:", decodedToken.id);
      
      if (!decodedToken.id) {
        console.log("[API Verify] El token no contiene un ID de usuario");
        return NextResponse.json(
          { message: "Token inválido" },
          { status: 401 }
        );
      }
      
      // Verificación adicional en la base de datos
      const user = await prisma.user.findUnique({
        where: { id: decodedToken.id },
        include: {
          stores: {
            select: {
              id: true,
              name: true,
              username: true,
              status: true
            }
          }
        }
      });
      
      if (!user) {
        console.log("[API Verify] Usuario no encontrado en la base de datos:", decodedToken.id);
        return NextResponse.json(
          { message: "Usuario no encontrado" },
          { status: 404 }
        );
      }
      
      // Variables para construir la respuesta
      let userResponse: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      
      // Si el token tiene datos de tienda, verificar que exista
      if (decodedToken.storeId) {
        const storeInToken = user.stores.find(store => store.id === decodedToken.storeId);
        
        if (!storeInToken) {
          console.log("[API Verify] Tienda no encontrada para el usuario:", decodedToken.storeId);
          return NextResponse.json(
            { message: "Tienda no encontrada para este usuario" },
            { status: 404 }
          );
        }
        
        if (storeInToken.status !== "ACTIVE") {
          console.log("[API Verify] Tienda inactiva:", storeInToken.status);
          return NextResponse.json(
            { message: "Esta tienda está inactiva o suspendida" },
            { status: 403 }
          );
        }
        
        // Agregar datos de la tienda a la respuesta
        userResponse.storeId = storeInToken.id;
        userResponse.storeName = storeInToken.name;
        userResponse.storeUsername = storeInToken.username;
      }
      
      // Para usuarios STORE, verificar que tengan una tienda
      if (user.role === UserRole.STORE && user.stores.length === 0) {
        console.log("[API Verify] Usuario STORE sin tiendas asignadas");
        return NextResponse.json(
          { message: "Usuario sin tiendas asignadas" },
          { status: 403 }
        );
      }
      
      // Si es un usuario STORE y no tiene storeId en el token,
      // usar la primera tienda activa
      if (user.role === UserRole.STORE && !userResponse.storeId) {
        const activeStore = user.stores.find(store => store.status === "ACTIVE");
        
        if (!activeStore) {
          console.log("[API Verify] Usuario STORE sin tiendas activas");
          return NextResponse.json(
            { message: "Usuario sin tiendas activas" },
            { status: 403 }
          );
        }
        
        userResponse.storeId = activeStore.id;
        userResponse.storeName = activeStore.name;
        userResponse.storeUsername = activeStore.username;
      }
      
      console.log("[API Verify] Verificación exitosa:", {
        userId: userResponse.id,
        role: userResponse.role,
        ...(userResponse.storeId && { storeId: userResponse.storeId })
      });
      
      // Crear respuesta
      const response = NextResponse.json({
        user: userResponse,
        success: true,
        message: "Token verificado correctamente"
      });
      
      // Actualizar la cookie para mantener la sesión activa
      // Establecer la cookie principal
      response.cookies.set({
        name: "session_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 día
        path: "/"
      });
      
      // Establecer también una cookie de respaldo no-httpOnly que el cliente pueda leer
      response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: false, // Esta cookie es legible por JavaScript
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 1 día
        path: "/"
      });
      
      console.log("[API Verify] Cookies renovadas correctamente");
      
      return response;
      
    } catch (tokenError: any) {
      console.error("[API Verify] Error al verificar el token:", tokenError.message);
      
      if (tokenError.name === "TokenExpiredError") {
        return NextResponse.json(
          { message: "El token ha expirado" },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { message: "Token inválido", error: tokenError.message },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error("[API Verify] Error en verificación:", error);
    return NextResponse.json(
      { message: "Error en el servidor", error: String(error) },
      { status: 500 }
    );
  }
} 