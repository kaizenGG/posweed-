import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";

// GET - Obtener items de inventario para la tienda actual
export async function GET(req: NextRequest) {
  try {
    console.log("[API Inventory] Getting inventory items");
    
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
    
    // Obtener todos los items de inventario con sus productos y salas asociadas
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
    
    console.log(`[API Inventory] Found ${inventoryItems.length} inventory items`);
    
    // Transformar los datos para que coincidan con el formato esperado por el frontend
    const formattedInventory = inventoryItems.map(item => {
      // Calcular el valor estimado basado en el precio del producto y la cantidad
      const estValue = item.product.price * item.quantity;
      // Calcular el costo estimado basado en el costo promedio y la cantidad
      const estCost = item.avgCost * item.quantity;
      
      return {
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          stock: item.product.stock,
          category: item.product.category || "",
          categoryObj: item.product.categoryObj,
          categoryId: item.product.categoryId
        },
        room: item.room.name,
        roomId: item.roomId,
        quantity: item.quantity,
        avgCost: item.avgCost,
        estCost: estCost,
        estValue: estValue
      };
    });
    
    return NextResponse.json(formattedInventory);
    
  } catch (error) {
    console.error("[API Inventory] Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar item de inventario
export async function PUT(req: NextRequest) {
  try {
    console.log("[API Inventory] Updating inventory item");
    
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
    const { productId, roomId, quantity } = body;
    
    // Validar datos
    if (!productId || !roomId || quantity === undefined) {
      console.log("[API Inventory] Missing required fields:", { productId, roomId, quantity });
      return NextResponse.json(
        { error: "Missing required fields: productId, roomId, quantity" },
        { status: 400 }
      );
    }
    
    // Verificar que el quantity sea un número positivo
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      console.log("[API Inventory] Invalid quantity:", quantity);
      return NextResponse.json(
        { error: "Invalid quantity: must be a positive number" },
        { status: 400 }
      );
    }
    
    // Buscar el item de inventario existente
    let inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        roomId,
        storeId
      }
    });
    
    if (!inventoryItem) {
      console.log("[API Inventory] Inventory item not found");
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Calcular diferencia de stock
    const stockDifference = numQuantity - inventoryItem.quantity;
    
    // Actualizar item de inventario
    const updatedInventoryItem = await prisma.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: numQuantity
      }
    });
    
    // Actualizar stock del producto
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: {
          increment: stockDifference
        }
      }
    });
    
    // Registrar transacción si el stock cambió
    if (stockDifference !== 0) {
      await prisma.inventoryTransaction.create({
        data: {
          type: 'ADJUSTMENT',
          quantity: Math.abs(stockDifference),
          cost: inventoryItem.avgCost,
          notes: 'Ajuste manual de inventario',
          product: { connect: { id: productId } },
          room: { connect: { id: roomId } },
          inventoryItem: { connect: { id: inventoryItem.id } },
          store: { connect: { id: storeId } }
        }
      });
    }
    
    console.log("[API Inventory] Inventory item updated successfully");
    return NextResponse.json({ success: true, inventoryItem: updatedInventoryItem });
    
  } catch (error) {
    console.error("[API Inventory] Error updating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar item de inventario
export async function DELETE(req: NextRequest) {
  try {
    console.log("[API Inventory] Deleting inventory item");
    
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
    const { productId, roomId } = body;
    
    // Validar datos
    if (!productId || !roomId) {
      console.log("[API Inventory] Missing required fields:", { productId, roomId });
      return NextResponse.json(
        { error: "Missing required fields: productId, roomId" },
        { status: 400 }
      );
    }
    
    // Buscar el item de inventario existente
    let inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        roomId,
        storeId
      }
    });
    
    if (!inventoryItem) {
      console.log("[API Inventory] Inventory item not found");
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }
    
    // Actualizar stock del producto antes de eliminar el item
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: {
          decrement: inventoryItem.quantity
        }
      }
    });
    
    // Registrar transacción de eliminación
    await prisma.inventoryTransaction.create({
      data: {
        type: 'ADJUSTMENT',
        quantity: inventoryItem.quantity,
        cost: inventoryItem.avgCost,
        notes: 'Eliminación manual de inventario',
        product: { connect: { id: productId } },
        room: { connect: { id: roomId } },
        inventoryItem: { connect: { id: inventoryItem.id } },
        store: { connect: { id: storeId } }
      }
    });
    
    // Eliminar item de inventario
    await prisma.inventoryItem.delete({
      where: { id: inventoryItem.id }
    });
    
    console.log("[API Inventory] Inventory item deleted successfully");
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("[API Inventory] Error deleting inventory item:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
} 