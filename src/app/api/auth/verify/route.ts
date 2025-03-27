import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { sign } from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    // Obtener datos del body
    const body = await req.json().catch(err => {
      console.error("[API Verify] Error al parsear el body:", err);
      return {};
    });
    
    // Caso 1: Verificación de token existente
    if (body.token) {
      return await verifyExistingToken(body.token);
    }
    
    // Caso 2: Generación de nuevo token con credenciales
    if (body.email && body.password) {
      return await generateTokenWithCredentials(body.email, body.password);
    }
    
    // Si no se proporciona ni token ni credenciales
    console.log("[API Verify] No se proporcionó token ni credenciales");
    return NextResponse.json(
      { message: "No se proporcionó token ni credenciales para verificar" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API Verify] Error en verificación:", error);
    return NextResponse.json(
      { message: "Error en el servidor", error: String(error) },
      { status: 500 }
    );
  }
}

// Función para verificar un token existente
async function verifyExistingToken(token: string) {
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
    let storeId = decodedToken.storeId;
    
    if (storeId) {
      const storeInToken = user.stores.find(store => store.id === storeId);
      
      if (!storeInToken) {
        console.log("[API Verify] Tienda no encontrada para el usuario:", storeId);
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
      token: token, // Devolver el mismo token para consistencia
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
}

// Función para generar un nuevo token con credenciales
async function generateTokenWithCredentials(email: string, password: string) {
  try {
    console.log("[API Verify] Generando nuevo token con credenciales");
    
    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        hashedPassword: true,
        role: true,
        image: true,
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
    
    if (!user || !user.hashedPassword) {
      console.log("[API Verify] Usuario no encontrado o sin contraseña");
      return NextResponse.json(
        { message: "Credenciales inválidas" },
        { status: 401 }
      );
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(
      password,
      user.hashedPassword
    );
    
    if (!isValidPassword) {
      console.log("[API Verify] Contraseña incorrecta");
      return NextResponse.json(
        { message: "Credenciales inválidas" },
        { status: 401 }
      );
    }
    
    // Datos para el token
    let tokenData: any = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    // Si es tienda, añadir datos de la primera tienda activa
    if (user.role === UserRole.STORE && user.stores.length > 0) {
      const activeStore = user.stores.find(store => store.status === "ACTIVE");
      if (activeStore) {
        tokenData.storeId = activeStore.id;
      }
    }
    
    // Generar token JWT
    const token = sign(
      tokenData,
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "7d" } // 7 días de validez
    );
    
    console.log("[API Verify] Nuevo token generado exitosamente");
    
    // Preparar datos de usuario para la respuesta
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(tokenData.storeId && {
        storeId: tokenData.storeId,
        storeName: user.stores.find(s => s.id === tokenData.storeId)?.name,
        storeUsername: user.stores.find(s => s.id === tokenData.storeId)?.username
      })
    };
    
    // Crear respuesta
    const response = NextResponse.json({
      user: userResponse,
      token,
      success: true,
      message: "Token generado correctamente"
    });
    
    // Establecer cookies
    response.cookies.set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/"
    });
    
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/"
    });
    
    console.log("[API Verify] Cookies establecidas para el nuevo token");
    
    return response;
  } catch (error) {
    console.error("[API Verify] Error al generar token con credenciales:", error);
    return NextResponse.json(
      { message: "Error al procesar las credenciales", error: String(error) },
      { status: 500 }
    );
  }
} 