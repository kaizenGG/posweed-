import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { verifyAuth } from "@/lib/auth";

// Schema for category creation/update
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  unit: z.string().min(1, "Unit is required"),
  stockAlert: z.string().min(1, "Stock Alert is required"),
});

// GET - Get all categories for the current store
export async function GET(req: NextRequest) {
  try {
    console.log("[API Categories] Getting categories");
    
    // Verify authentication
    const auth = await verifyAuth();
    
    if (!auth || !auth.storeId) {
      console.log("[API Categories] Invalid or missing auth/storeId:", auth);
      return NextResponse.json({ 
        error: "Unauthorized - Invalid store access",
        categories: [] 
      }, { status: 403 });
    }
    
    const storeId = auth.storeId;
    console.log(`[API Categories] Verified user with storeId: ${storeId}`);
    
    // Get categories for this store with product counts
    const categories = await prisma.category.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    // Transform data to include product count
    const categoriesWithProductCount = categories.map(category => ({
      id: category.id,
      name: category.name,
      color: category.color,
      unit: category.unit,
      stockAlert: category.stockAlert,
      productsCount: category._count.products
    }));
    
    console.log(`[API Categories] Found ${categories.length} categories for store ${storeId}`);
    
    return NextResponse.json({ 
      success: true, 
      categories: categoriesWithProductCount
    });
  } catch (error) {
    console.error("[API Categories] Error getting categories:", error);
    return NextResponse.json({ 
      error: "Error getting categories",
      categories: [] 
    }, { status: 500 });
  }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
  try {
    console.log("[API Categories] Creating new category");
    
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
    
    // Parse request body
    const body = await req.json();
    
    // Validate data
    const validationResult = categorySchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log("[API Categories] Validation failed:", validationResult.error);
      return NextResponse.json({ 
        error: "Invalid category data", 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    // Check for duplicates
    const existingCategory = await prisma.category.findFirst({
      where: {
        storeId,
        name: body.name
      }
    });
    
    if (existingCategory) {
      return NextResponse.json({ 
        error: "A category with this name already exists" 
      }, { status: 409 });
    }
    
    // Create new category
    const category = await prisma.category.create({
      data: {
        name: body.name,
        color: body.color,
        unit: body.unit,
        stockAlert: body.stockAlert,
        storeId
      }
    });
    
    console.log(`[API Categories] Category created successfully: ${category.id}`);
    
    return NextResponse.json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("[API Categories] Error creating category:", error);
    return NextResponse.json({ 
      error: "Error creating category", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 