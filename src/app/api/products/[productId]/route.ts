import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { verifyAuthToken } from "@/lib/auth";

// GET - Get detailed product information
export async function GET(
  req: NextRequest,
  context: { params: { productId: string } }
) {
  try {
    console.log(`[API Products] Getting details for product: ${context.params.productId}`);
    
    // Verificar token de autenticación
    const authResult = await verifyAuthToken(req);
    
    if (!authResult.success) {
      console.log("[API Products] Auth failed:", authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    const { storeId } = authResult;
    console.log(`[API Products] Verified user with storeId: ${storeId}`);
    
    const productId = context.params.productId;
    
    // Get product details with category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        categoryObj: true
      }
    });
    
    if (!product) {
      console.log(`[API Products] Product not found: ${productId}`);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    if (product.storeId !== storeId) {
      console.log(`[API Products] Product ${productId} belongs to store ${product.storeId}, not ${storeId}`);
      return NextResponse.json({ error: "You don't have permission to access this product" }, { status: 403 });
    }
    
    // Get inventory items for this product
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        productId,
        storeId
      },
      include: {
        room: true
      }
    });
    
    // Get inventory transactions for this product
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        productId,
        storeId
      },
      include: {
        room: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit to recent 20 transactions
    });
    
    // Calculate inventory stats
    const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const weightedCost = inventoryItems.reduce((sum, item) => sum + (item.avgCost * item.quantity), 0);
    const avgCost = totalQuantity > 0 ? weightedCost / totalQuantity : (product.price * 0.6);
    const totalValue = totalQuantity * product.price;
    
    // Format transactions into logs
    const logs = transactions.map(tx => ({
      type: tx.type,
      date: tx.createdAt,
      product: product.name,
      initialStock: `${tx.quantity}g`,
      quantity: tx.type === 'SALE' ? `-${tx.quantity}g` : `+${tx.quantity}g`,
      currentStock: `${tx.quantity}g`,
      roomFrom: tx.room.name
    }));
    
    return NextResponse.json({
      product: {
        ...product,
        description: product.description || "A Sativa strain with THC of 13.70% and CBD of 0.12%. Known for feelings of happy, uplifted, euphoric, creative. May cause dry eyes, dry mouth, paranoia, anxiety."
      },
      inventory: {
        items: inventoryItems,
        totalQuantity,
        avgCost,
        totalValue
      },
      logs
    });
    
  } catch (error) {
    console.error("[API Products] Error:", error);
    return NextResponse.json(
      { error: "Error getting product details" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(
  req: NextRequest,
  context: { params: { productId: string } }
) {
  try {
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const productId = params.productId;
    
    if (!productId) {
      return NextResponse.json({ error: "Product ID not provided" }, { status: 400 });
    }
    
    console.log(`[API Products] Deleting product: ${productId}`);
    
    // Verify authentication
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Products] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Products] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Products] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Products] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Check if the product exists and belongs to the store
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      console.log(`[API Products] Product not found: ${productId}`);
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    if (product.storeId !== storeId) {
      console.log(`[API Products] Product ${productId} belongs to store ${product.storeId}, not ${storeId}`);
      return NextResponse.json({ error: "You don't have permission to delete this product" }, { status: 403 });
    }
    
    try {
      // En lugar de eliminar físicamente, marcar como eliminado (soft delete)
      await prisma.product.update({
        where: { id: productId },
        data: { 
          isDeleted: true,
          stock: 0 // Establecer stock a 0 para evitar ventas futuras
        },
      });
      
      console.log(`[API Products] Product soft-deleted successfully: ${productId}`);
      
      return NextResponse.json({ 
        success: true, 
        message: "Product deleted successfully" 
      });
    } catch (updateError) {
      console.error("[API Products] Error soft-deleting product:", updateError);
      
      // Si ocurre un error, intentar actualizar solo el estado isDeleted
      try {
        await prisma.product.update({
          where: { id: productId },
          data: { isDeleted: true },
        });
        
        console.log(`[API Products] Product marked as deleted: ${productId}`);
        
        return NextResponse.json({ 
          success: true, 
          message: "Product has been deleted" 
        });
      } catch (fallbackError) {
        console.error("[API Products] Error in fallback delete:", fallbackError);
        return NextResponse.json({ error: "Error deleting product" }, { status: 500 });
      }
    }
  } catch (error) {
    console.error("[API Products] Error deleting product:", error);
    return NextResponse.json({ error: "Error deleting product" }, { status: 500 });
  }
} 