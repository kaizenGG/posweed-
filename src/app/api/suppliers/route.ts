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

// GET /api/suppliers - Obtener todos los proveedores
export async function GET(req: NextRequest) {
  console.log("[API Suppliers] Obteniendo proveedores");
  
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();
    
    if (!storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    console.log(`[API Suppliers] Usuario verificado con storeId: ${storeId}`);

    // Obtener todos los proveedores de la tienda
    const suppliers = await prisma.supplier.findMany({
      where: {
        storeId: storeId
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`[API Suppliers] Encontrados ${suppliers.length} proveedores`);
    
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("[API Suppliers] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Crear un nuevo proveedor
export async function POST(req: NextRequest) {
  console.log("[API Suppliers] Creando proveedor");
  
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();
    
    if (!storeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    
    // Crear el proveedor
    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        storeId
      }
    });
    
    console.log(`[API Suppliers] Proveedor creado con ID: ${supplier.id}`);
    
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("[API Suppliers] Error:", error);
    return NextResponse.json(
      { error: "Error al crear proveedor" },
      { status: 500 }
    );
  }
} 