import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcrypt";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { UserRole } from "@prisma/client";
import { hashPassword } from "@/lib/password-utils";
import { createDefaultCategoriesForStore } from '@/lib/categories';
// Comentamos temporalmente la creación de la base de datos para descartar errores
// import { createStoreDatabase } from "@/lib/store-database";

// Schema para validar la creación de tiendas
const storeSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// GET - Listar todas las tiendas
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string };
      
      if (!payload || payload.role !== "ADMIN") {
        return NextResponse.json({ error: "No tiene permisos para realizar esta acción" }, { status: 403 });
      }
    } catch (error) {
      console.error("Error al verificar JWT:", error);
      return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
    }
    
    // Obtener todas las tiendas
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Error al listar tiendas:", error);
    return NextResponse.json({ error: "Error al cargar las tiendas" }, { status: 500 });
  }
}

// POST - Crear una nueva tienda
export async function POST(req: NextRequest) {
  try {
    console.log("[API Stores] Solicitud de creación de tienda recibida");
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string };
      
      if (!payload || payload.role !== "ADMIN") {
        return NextResponse.json({ error: "No tiene permisos para realizar esta acción" }, { status: 403 });
      }
    } catch (error) {
      console.error("Error al verificar JWT:", error);
      return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
    }
    
    // Obtener y validar datos
    const body = await req.json();
    
    const result = storeSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.format();
      return NextResponse.json({ error: "Datos inválidos", errors }, { status: 400 });
    }
    
    const { name, username, password } = result.data;
    
    // Verificar si ya existe una tienda con ese nombre de usuario
    const existingStore = await prisma.store.findUnique({
      where: { username }
    });
    
    if (existingStore) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 });
    }
    
    // Obtener el usuario admin
    const adminUser = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN }
    });
    
    if (!adminUser) {
      return NextResponse.json({ error: "No se encontró un usuario administrador" }, { status: 500 });
    }
    
    // Crear la tienda
    const hashedPassword = await hash(password, 10);
    
    const store = await prisma.store.create({
      data: {
        name,
        username,
        hashedPassword,
        status: "ACTIVE",
        userId: adminUser.id,
      },
    });
    
    console.log(`[API Stores] Tienda creada: ${store.id}`);
    
    // Create default categories for the new store
    try {
      await createDefaultCategoriesForStore(store.id);
      console.log(`[API Stores] Categorías por defecto creadas para tienda ${store.id}`);
    } catch (error) {
      console.error(`[API Stores] Error al crear categorías por defecto:`, error);
      // Continue even if categories creation fails, we don't want to roll back the store creation
    }
    
    return NextResponse.json({
      success: true,
      message: "Tienda creada exitosamente",
      store: {
        id: store.id,
        name: store.name,
        username: store.username
      }
    });
  } catch (error) {
    console.error("Error al crear tienda:", error);
    return NextResponse.json({ error: "Error al crear la tienda" }, { status: 500 });
  }
} 