import { NextRequest, NextResponse } from "next/server";
import { verifyJwtAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";

// Definición de interfaces para mejor tipado
interface InventoryItemWithRelations {
  id: string;
  productId: string;
  roomId: string;
  storeId: string;
  quantity: number;
  avgCost: number;
  product: any;
  room: any;
}

// GET - Obtener estadísticas de inventario
export async function GET(req: NextRequest) {
  try {
    console.log("[API] Get inventory stats - Request received");
    
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API] Get inventory stats - No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API] Get inventory stats - Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API] Get inventory stats - Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API] Get inventory stats - Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Obtener todos los productos de la tienda
    console.log(`[API] Get inventory stats - Fetching products for store: ${storeId}`);
    const products = await prisma.product.findMany({
      where: {
        storeId
      },
      include: {
        categoryObj: true
      }
    });
    
    console.log(`[API] Get inventory stats - Found ${products.length} products`);
    
    // Obtener todas las salas de la tienda
    console.log(`[API] Get inventory stats - Fetching rooms for store: ${storeId}`);
    const rooms = await prisma.room.findMany({
      where: {
        storeId
      }
    });
    
    console.log(`[API] Get inventory stats - Found ${rooms.length} rooms`);
    
    // Obtener todos los items de inventario para la tienda
    console.log(`[API] Get inventory stats - Fetching inventory items for store: ${storeId}`);
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        storeId
      },
      include: {
        product: {
          include: {
            categoryObj: true
          }
        },
        room: true
      }
    });
    
    console.log(`[API] Get inventory stats - Found ${inventoryItems.length} inventory items`);
    
    // Si no hay items de inventario reales, crear inventario básico usando productos y salas
    let inventory: InventoryItemWithRelations[] = inventoryItems;
    
    if (inventoryItems.length === 0 && products.length > 0 && rooms.length > 0) {
      console.log("[API] Get inventory stats - Creating basic inventory items");
      
      // Crear un inventario básico donde todos los productos estén en la primera sala
      const defaultRoom = rooms[0];
      
      inventory = products.map(product => ({
        id: `virtual_${product.id}_${defaultRoom.id}`,
        quantity: product.stock || 0,
        avgCost: product.price * 0.6, // Costo estimado como 60% del precio
        product: product,
        room: defaultRoom,
        productId: product.id,
        roomId: defaultRoom.id,
        storeId
      }));
      
      console.log(`[API] Get inventory stats - Created ${inventory.length} virtual inventory items`);
    }
    
    // Preparar respuesta con estadísticas calculadas
    const response = {
      success: true,
      inventory: inventory.map(item => ({
        id: item.id,
        productId: item.productId,
        roomId: item.roomId,
        quantity: item.quantity,
        avgCost: item.avgCost || (item.product.price * 0.6),
        product: item.product,
        room: item.room,
        estimatedCost: item.quantity * (item.avgCost || (item.product.price * 0.6)),
        estimatedValue: item.quantity * item.product.price
      }))
    };
    
    console.log(`[API] Get inventory stats - Returning ${response.inventory.length} inventory items with stats`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("[API] Get inventory stats - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory stats", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 