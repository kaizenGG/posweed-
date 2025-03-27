import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactName: z.string().optional(),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

// GET /api/suppliers/[id] - Obtener un proveedor específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[API Suppliers] Obteniendo proveedor ID: ${id}`);
  
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();
    
    if (!storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    // Obtener el proveedor
    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      }
    });
    
    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }
    
    // Verificar que el proveedor pertenezca a la tienda
    if (supplier.storeId !== storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("[API Suppliers] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedor" },
      { status: 500 }
    );
  }
}

// PUT /api/suppliers/[id] - Actualizar un proveedor
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[API Suppliers] Actualizando proveedor ID: ${id}`);
  
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();
    
    if (!storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    // Verificar que el proveedor exista y pertenezca a la tienda
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id,
      }
    });
    
    if (!existingSupplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }
    
    if (existingSupplier.storeId !== storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    
    // Obtener datos del cuerpo de la solicitud
    const body = await req.json();
    
    // Validar datos
    const validationResult = supplierSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Actualizar el proveedor
    const updatedSupplier = await prisma.supplier.update({
      where: {
        id,
      },
      data
    });
    
    console.log(`[API Suppliers] Proveedor actualizado: ${updatedSupplier.id}`);
    
    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error("[API Suppliers] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar proveedor" },
      { status: 500 }
    );
  }
}

// DELETE /api/suppliers/[id] - Eliminar un proveedor
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`[API Suppliers] Eliminando proveedor ID: ${id}`);
  
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();
    
    if (!storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    // Verificar que el proveedor exista y pertenezca a la tienda
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id,
      }
    });
    
    if (!existingSupplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }
    
    if (existingSupplier.storeId !== storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    
    // Verificar si el proveedor está siendo usado en transacciones
    const transactionCount = await prisma.inventoryTransaction.count({
      where: {
        supplierId: id
      }
    });
    
    if (transactionCount > 0) {
      return NextResponse.json(
        { 
          error: "No se puede eliminar el proveedor", 
          message: "Este proveedor tiene transacciones asociadas" 
        }, 
        { status: 400 }
      );
    }
    
    // Eliminar el proveedor
    await prisma.supplier.delete({
      where: {
        id,
      }
    });
    
    console.log(`[API Suppliers] Proveedor eliminado: ${id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Suppliers] Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar proveedor" },
      { status: 500 }
    );
  }
} 