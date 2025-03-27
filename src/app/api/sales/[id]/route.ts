import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - Obtener una venta específica por ID
export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  // Esperar los parámetros de ruta como recomienda Next.js 15
  const params = await context.params;
  const id = params.id;
  console.log(`[API Sales] Getting sale with ID: ${id}`);
  
  try {
    // Verificar token de autenticación
    const authResult = await verifyAuthToken(req);
    
    if (!authResult.success) {
      console.log("[API Sales] Auth failed:", authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    const { storeId } = authResult;
    console.log(`[API Sales] Verified user with storeId: ${storeId}`);
    
    if (!storeId) {
      return NextResponse.json(
        { error: "No store ID associated with this user" },
        { status: 400 }
      );
    }
    
    // Obtener la venta con los detalles
    const sale = await prisma.sale.findFirst({
      where: {
        id,
        storeId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        store: {
          select: {
            name: true,
            address: true,
            phone: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    if (!sale) {
      console.log(`[API Sales] Sale with ID ${id} not found or not authorized`);
      return NextResponse.json(
        { error: "Venta no encontrada" },
        { status: 404 }
      );
    }
    
    console.log(`[API Sales] Found sale with invoice number: ${sale.invoiceNumber}`);
    
    return NextResponse.json({ sale });
  } catch (error) {
    console.error("[API Sales] Error:", error);
    return NextResponse.json(
      { error: "Error obteniendo venta" },
      { status: 500 }
    );
  }
} 