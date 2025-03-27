import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Faltan credenciales" },
        { status: 400 }
      );
    }
    
    // Búsqueda 1: Por username en Store
    const store = await prisma.store.findUnique({
      where: { username },
      include: { user: true }
    });
    
    // Búsqueda 2: Por email en User
    const userByEmail = await prisma.user.findFirst({
      where: { email: username }
    });
    
    // Resultados
    const results = {
      storeFound: !!store,
      userFromStore: store ? {
        id: store.user?.id,
        email: store.user?.email,
        role: store.user?.role,
        hasHashedPassword: !!store.user?.hashedPassword,
        passwordHashPrefix: store.user?.hashedPassword ? store.user.hashedPassword.substring(0, 10) + "..." : null
      } : null,
      
      storeHasHashedPassword: !!store?.hashedPassword,
      storePasswordHashPrefix: store?.hashedPassword ? store.hashedPassword.substring(0, 10) + "..." : null,
      
      userByEmailFound: !!userByEmail,
      userByEmail: userByEmail ? {
        id: userByEmail.id,
        email: userByEmail.email,
        role: userByEmail.role,
        hasHashedPassword: !!userByEmail.hashedPassword,
        passwordHashPrefix: userByEmail.hashedPassword ? userByEmail.hashedPassword.substring(0, 10) + "..." : null
      } : null
    };
    
    // Verificar contraseña para tienda si se encontró
    let storePasswordValid = false;
    if (store?.hashedPassword) {
      try {
        storePasswordValid = await compare(password, store.hashedPassword);
      } catch (e) {
        console.error("Error al comparar contraseña de tienda:", e);
      }
    }
    
    // Verificar contraseña de usuario de tienda si existe
    let storeUserPasswordValid = false;
    if (store?.user?.hashedPassword) {
      try {
        storeUserPasswordValid = await compare(password, store.user.hashedPassword);
      } catch (e) {
        console.error("Error al comparar contraseña de usuario de tienda:", e);
      }
    }
    
    // Verificar contraseña para usuario si se encontró
    let userPasswordValid = false;
    if (userByEmail?.hashedPassword) {
      try {
        userPasswordValid = await compare(password, userByEmail.hashedPassword);
      } catch (e) {
        console.error("Error al comparar contraseña de usuario:", e);
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      passwordCheck: {
        storePasswordValid,
        storeUserPasswordValid,
        userPasswordValid
      }
    });
    
  } catch (error) {
    console.error("Error en test de credenciales:", error);
    return NextResponse.json(
      { success: false, message: "Error al verificar credenciales", error: String(error) },
      { status: 500 }
    );
  }
} 