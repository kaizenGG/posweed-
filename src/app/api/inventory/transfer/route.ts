import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";

// POST - Transferir stock entre habitaciones
export async function POST(req: NextRequest) {
  try {
    console.log("[API Inventory] Transferring inventory stock between rooms");
    
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Inventory] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Inventory] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Inventory] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Inventory] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Obtener datos del cuerpo de la solicitud
    const body = await req.json();
    const { productId, sourceRoomId, destinationRoomId, quantity } = body;
    
    // Validar datos
    if (!productId || !sourceRoomId || !destinationRoomId || quantity === undefined) {
      console.log("[API Inventory] Missing required fields:", { productId, sourceRoomId, destinationRoomId, quantity });
      return NextResponse.json(
        { error: "Missing required fields: productId, sourceRoomId, destinationRoomId, quantity" },
        { status: 400 }
      );
    }
    
    // Verificar que el quantity sea un número positivo
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      console.log("[API Inventory] Invalid quantity:", quantity);
      return NextResponse.json(
        { error: "Invalid quantity: must be a positive number" },
        { status: 400 }
      );
    }
    
    // Verificar que las habitaciones sean diferentes
    if (sourceRoomId === destinationRoomId) {
      console.log("[API Inventory] Source and destination rooms are the same");
      return NextResponse.json(
        { error: "Source and destination rooms must be different" },
        { status: 400 }
      );
    }
    
    // Buscar las habitaciones para verificar que existan
    const sourceRoom = await prisma.room.findFirst({
      where: {
        id: sourceRoomId,
        storeId
      }
    });
    
    const destinationRoom = await prisma.room.findFirst({
      where: {
        id: destinationRoomId,
        storeId
      }
    });
    
    if (!sourceRoom || !destinationRoom) {
      console.log("[API Inventory] Room not found:", { sourceExists: !!sourceRoom, destinationExists: !!destinationRoom });
      return NextResponse.json(
        { error: "Source or destination room not found" },
        { status: 404 }
      );
    }
    
    // Buscar el item de inventario en la habitación origen
    const sourceInventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        roomId: sourceRoomId,
        storeId
      }
    });
    
    if (!sourceInventoryItem) {
      console.log("[API Inventory] Source inventory item not found");
      return NextResponse.json(
        { error: "Source inventory item not found" },
        { status: 404 }
      );
    }
    
    // Verificar que haya suficiente stock en la habitación origen
    if (sourceInventoryItem.quantity < numQuantity) {
      console.log("[API Inventory] Insufficient stock:", { available: sourceInventoryItem.quantity, requested: numQuantity });
      return NextResponse.json(
        { error: "Insufficient stock in source room" },
        { status: 400 }
      );
    }
    
    // Buscar el item de inventario en la habitación destino
    let destinationInventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        roomId: destinationRoomId,
        storeId
      }
    });
    
    // Usar transacción para garantizar la integridad de los datos
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el item de inventario origen
      const updatedSourceItem = await tx.inventoryItem.update({
        where: { id: sourceInventoryItem.id },
        data: {
          quantity: {
            decrement: numQuantity
          }
        }
      });
      
      // 2. Actualizar o crear el item de inventario destino
      let updatedDestinationItem;
      if (destinationInventoryItem) {
        // Actualizar item existente
        updatedDestinationItem = await tx.inventoryItem.update({
          where: { id: destinationInventoryItem.id },
          data: {
            quantity: {
              increment: numQuantity
            }
          }
        });
      } else {
        // Crear nuevo item
        updatedDestinationItem = await tx.inventoryItem.create({
          data: {
            productId,
            roomId: destinationRoomId,
            storeId,
            quantity: numQuantity,
            avgCost: sourceInventoryItem.avgCost // Usar el mismo costo promedio
          }
        });
      }
      
      // 3. Registrar la transacción de transferencia
      const transaction = await tx.inventoryTransaction.create({
        data: {
          type: 'TRANSFER',
          quantity: numQuantity,
          cost: sourceInventoryItem.avgCost,
          notes: `Transferencia de ${numQuantity} unidades de ${sourceRoom.name} a ${destinationRoom.name}`,
          product: { connect: { id: productId } },
          room: { connect: { id: sourceRoomId } }, // Se registra en la habitación de origen
          inventoryItem: { connect: { id: sourceInventoryItem.id } },
          store: { connect: { id: storeId } }
        }
      });
      
      return {
        sourceItem: updatedSourceItem,
        destinationItem: updatedDestinationItem,
        transaction
      };
    });
    
    console.log("[API Inventory] Stock transferred successfully");
    
    // Eliminar el item de inventario origen si quedó en cero
    if (result.sourceItem.quantity === 0) {
      await prisma.inventoryItem.delete({
        where: { id: result.sourceItem.id }
      });
      console.log("[API Inventory] Source inventory item deleted because quantity is zero");
    }
    
    return NextResponse.json({ 
      success: true,
      message: "Stock transferred successfully",
      data: result
    });
    
  } catch (error) {
    console.error("[API Inventory] Error transferring stock:", error);
    return NextResponse.json(
      { error: "Failed to transfer stock" },
      { status: 500 }
    );
  }
} 