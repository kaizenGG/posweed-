import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";

// DELETE - Delete a category
export async function DELETE(
  req: NextRequest,
  context: { params: { categoryId: string } }
) {
  try {
    // Esperar los parámetros de ruta como recomienda Next.js 15
    const params = await context.params;
    const categoryId = params.categoryId;
    
    if (!categoryId) {
      return NextResponse.json({ error: "Category ID not provided" }, { status: 400 });
    }
    
    console.log(`[API Categories] Deleting category: ${categoryId}`);
    
    // Verify authentication
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Categories] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Categories] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Categories] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Categories] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Check if the category exists and belongs to the store
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    if (!category) {
      console.log(`[API Categories] Category not found: ${categoryId}`);
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    if (category.storeId !== storeId) {
      console.log(`[API Categories] Category ${categoryId} belongs to store ${category.storeId}, not ${storeId}`);
      return NextResponse.json({ error: "You don't have permission to delete this category" }, { status: 403 });
    }
    
    // Check if category has products
    if (category._count.products > 0) {
      console.log(`[API Categories] Category ${categoryId} has ${category._count.products} products`);
      return NextResponse.json({ 
        error: "Cannot delete category with products. Please remove or reassign all products first." 
      }, { status: 409 });
    }
    
    // Delete the category
    await prisma.category.delete({
      where: { id: categoryId },
    });
    
    console.log(`[API Categories] Category deleted successfully: ${categoryId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Category deleted successfully" 
    });
  } catch (error) {
    console.error("[API Categories] Error deleting category:", error);
    return NextResponse.json({ error: "Error deleting category" }, { status: 500 });
  }
} 