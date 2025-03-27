import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { format } from "date-fns";
import { verifyAuth } from '@/lib/auth';

/**
 * GET - Obtiene el historial de transacciones de inventario
 */
export async function GET() {
  try {
    console.log("[API Transactions] Iniciando solicitud GET para transacciones de inventario");
    
    // 1. Autenticar al usuario
    const authResult = await verifyAuth();
    if (!authResult || !authResult.userId) {
      console.error("[API Transactions] Fallo de autenticación");
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere autenticación' 
      }, { status: 401 });
    }

    const userId = authResult.userId;
    console.log(`[API Transactions] Usuario autenticado: ${userId}`);

    // 2. Obtener todas las tiendas del usuario
    const userStores = await prisma.store.findMany({
      where: { userId }
    });

    if (!userStores || userStores.length === 0) {
      console.error(`[API Transactions] No se encontraron tiendas para el usuario: ${userId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontraron tiendas' 
      }, { status: 404 });
    }

    // Obtener los IDs de todas las tiendas del usuario
    const storeIds = userStores.map(store => store.id);
    console.log(`[API Transactions] Obteniendo transacciones para ${storeIds.length} tiendas: ${storeIds.join(', ')}`);

    // 3. Obtener transacciones para todas las tiendas del usuario
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        storeId: {
          in: storeIds
        }
      },
      include: {
        product: {
          include: {
            categoryObj: true
          }
        },
        room: true,
        supplier: true,
        inventoryItem: true,
        store: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[API Transactions] Se encontraron ${transactions.length} transacciones de inventario`);
    
    // Log detallado de las transacciones encontradas para debugging
    if (transactions.length > 0) {
      console.log("[API Transactions] Lista de transacciones encontradas:");
      transactions.forEach((tx, index) => {
        if (index < 5) { // Solo mostrar los primeros 5 para no saturar el log
          console.log(`- ID: ${tx.id}, Tipo: ${tx.type}, Producto: ${tx.product?.name || 'N/A'}, Tienda: ${tx.store?.name || 'N/A'}`);
        }
      });
      if (transactions.length > 5) {
        console.log(`... y ${transactions.length - 5} más`);
      }
    } else {
      console.log("[API Transactions] No se encontraron transacciones para las tiendas del usuario");
    }

    // 4. Retornar transacciones
    return NextResponse.json({
      success: true,
      transactions: transactions.map(transaction => ({
        ...transaction,
        cost: transaction.cost || 0,
        quantity: transaction.quantity || 0
      }))
    });

  } catch (error) {
    console.error("[API Transactions] Error al obtener transacciones de inventario:", error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener transacciones de inventario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 