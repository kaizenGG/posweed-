import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcrypt";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { UserRole } from "@prisma/client";

// Schema para validar actualización de estado
const updateSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

// Schema para validar actualización de tienda
const storeUpdateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").optional(),
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres").optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

// GET - Obtener una tienda por ID
export async function GET(
  req: NextRequest,
  context: { params: { storeId: string } }
) {
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
    
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const storeId = params.storeId;
    
    if (!storeId) {
      return NextResponse.json({ error: "ID de tienda no proporcionado" }, { status: 400 });
    }
    
    // Buscar la tienda
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        createdAt: true,
      },
    });
    
    if (!store) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    
    return NextResponse.json(store);
  } catch (error) {
    console.error("Error al obtener tienda:", error);
    return NextResponse.json({ error: "Error al obtener la tienda" }, { status: 500 });
  }
}

// PUT - Actualizar tienda (nombre, usuario, contraseña)
export async function PUT(
  req: NextRequest,
  context: { params: { storeId: string } }
) {
  try {
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    // Verificar permisos de administrador
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string };
      
      if (!payload || payload.role !== "ADMIN") {
        return NextResponse.json({ error: "No tiene permisos para realizar esta acción" }, { status: 403 });
      }
    } catch (error) {
      console.error("Error al verificar JWT:", error);
      return NextResponse.json({ error: "Error de autenticación" }, { status: 401 });
    }
    
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const storeId = params.storeId;
    
    if (!storeId) {
      return NextResponse.json({ error: "ID de tienda no proporcionado" }, { status: 400 });
    }
    
    // Verificar si la tienda existe
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    
    if (!existingStore) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    
    // Obtener y validar datos
    const body = await req.json();
    const result = storeUpdateSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.format();
      return NextResponse.json({ error: "Datos inválidos", errors }, { status: 400 });
    }
    
    const { name, username, password } = result.data;
    
    // Verificar que al menos hay un campo para actualizar
    if (!name && !username && !password) {
      return NextResponse.json({ error: "Debe proporcionar al menos un campo para actualizar" }, { status: 400 });
    }
    
    // Verificar si el nuevo nombre de usuario ya existe (si se va a cambiar)
    if (username && username !== existingStore.username) {
      const usernameExists = await prisma.store.findUnique({
        where: { username },
      });
      
      if (usernameExists) {
        return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 400 });
      }
    }
    
    // Preparar datos para actualizar
    const updateData: any = {};
    
    if (name) {
      updateData.name = name;
    }
    
    if (username) {
      updateData.username = username;
    }
    
    if (password) {
      // Hashear la nueva contraseña
      updateData.hashedPassword = await hash(password, 10);
    }
    
    // Actualizar tienda
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Tienda actualizada exitosamente",
      store: updatedStore
    });
  } catch (error) {
    console.error("Error al actualizar tienda:", error);
    return NextResponse.json({ error: "Error al actualizar la tienda" }, { status: 500 });
  }
}

// PATCH - Actualizar estado de la tienda
export async function PATCH(
  req: NextRequest,
  context: { params: { storeId: string } }
) {
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
    
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const storeId = params.storeId;
    
    if (!storeId) {
      return NextResponse.json({ error: "ID de tienda no proporcionado" }, { status: 400 });
    }
    
    // Verificar si la tienda existe
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    
    if (!existingStore) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    
    // Obtener y validar datos
    const body = await req.json();
    
    const result = updateSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.format();
      return NextResponse.json({ error: "Datos inválidos", errors }, { status: 400 });
    }
    
    const { status } = result.data;
    
    // Actualizar estado
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { status },
      select: {
        id: true,
        name: true,
        username: true,
        status: true,
        createdAt: true,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Estado de tienda actualizado exitosamente",
      store: updatedStore
    });
  } catch (error) {
    console.error("Error al actualizar tienda:", error);
    return NextResponse.json({ error: "Error al actualizar la tienda" }, { status: 500 });
  }
}

// DELETE - Eliminar tienda
export async function DELETE(
  req: NextRequest,
  context: { params: { storeId: string } }
) {
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
    
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const storeId = params.storeId;
    
    if (!storeId) {
      return NextResponse.json({ error: "ID de tienda no proporcionado" }, { status: 400 });
    }
    
    // Verificar si la tienda existe
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    
    if (!existingStore) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
    }
    
    // Eliminar la tienda directamente
    await prisma.store.delete({
      where: { id: storeId },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Tienda eliminada exitosamente" 
    });
  } catch (error) {
    console.error("Error al eliminar tienda:", error);
    return NextResponse.json({ error: "Error al eliminar la tienda" }, { status: 500 });
  }
} 