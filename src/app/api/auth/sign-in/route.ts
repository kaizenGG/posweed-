import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// Función de utilidad para log mejorado
const debugLog = (prefix: string, message: string, data?: any) => {
  if (data) {
    console.log(`🔍 [AUTH-API:${prefix}] ${message}`, data);
  } else {
    console.log(`🔍 [AUTH-API:${prefix}] ${message}`);
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, loginAsStore } = body;
    
    console.log("[API] Intento de login para:", { username, hasPassword: !!password, loginAsStore });
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Faltan credenciales" },
        { status: 400 }
      );
    }
    
    // Verificar si es un login de tienda
    let user = null;
    let store = null;
    
    if (loginAsStore) {
      // Buscar la tienda por nombre de usuario, incluyendo el hashedPassword
      store = await prisma.store.findUnique({
        where: { username },
        select: { 
          id: true, 
          userId: true,
          hashedPassword: true,
          name: true,
          username: true 
        }
      });
      
      if (store) {
        // Obtener usuario asociado a la tienda
        user = await prisma.user.findUnique({
          where: { id: store.userId }
        });
      }
    } else {
      // Intentar buscar usuario por email
      user = await prisma.user.findFirst({
        where: { email: username }
      });
    }
    
    if (!user) {
      console.log("[API] Usuario no encontrado");
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 401 }
      );
    }
    
    // Verificar contraseña - para tiendas, usar la contraseña de la tienda
    let passwordField;
    if (loginAsStore && store?.hashedPassword) {
      passwordField = store.hashedPassword;
    } else {
      passwordField = user.hashedPassword;
    }
    
    if (!passwordField) {
      console.log("[API] Sin contraseña");
      return NextResponse.json(
        { success: false, message: "Usuario sin contraseña" },
        { status: 401 }
      );
    }
    
    // Comparar contraseña
    let isPasswordValid;
    try {
      isPasswordValid = await compare(password, passwordField);
    } catch (error) {
      console.error("[API] Error al verificar contraseña:", error);
      isPasswordValid = false;
    }
    
    if (!isPasswordValid) {
      console.log("[API] Contraseña incorrecta");
      return NextResponse.json(
        { success: false, message: "Contraseña incorrecta" },
        { status: 401 }
      );
    }
    
    // Generar token JWT
    const token = sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        ...(store && { storeId: store.id })
      },
      process.env.NEXTAUTH_SECRET || "fallback-secret",
      { expiresIn: "24h" }
    );
    
    // Preparar respuesta con datos del usuario (sin contraseña)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(store && { storeName: store.name, storeUsername: store.username })
    };
    
    console.log("[API] Login exitoso para:", userData.email);
    
    return NextResponse.json({
      success: true,
      message: "Login exitoso",
      token,
      user: userData
    });
    
  } catch (error) {
    console.error("[API] Error en login:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 