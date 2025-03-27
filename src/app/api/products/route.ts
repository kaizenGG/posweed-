import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import fs from 'fs';
import path from 'path';
import { verifyAuth } from "@/lib/auth";

// Generate a unique SKU for a product
const generateSKU = async (storeId: string, productName: string, category: string) => {
  // Create a base for the SKU using the first character of the category and a few letters from the product name
  const categoryCode = category.substring(0, 1).toUpperCase();
  
  // Clean the product name and take first 4 characters (or less if the name is shorter)
  const cleanName = productName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const nameCode = cleanName.substring(0, 4);
  
  // Get a count of similar products to ensure uniqueness
  const productCount = await prisma.product.count({
    where: {
      storeId,
      sku: {
        startsWith: `${categoryCode}${nameCode}`
      }
    }
  });
  
  // Generate a random hex string for added uniqueness
  const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
  
  // Combine all parts with a count to ensure uniqueness
  return `${categoryCode}${nameCode}${productCount}${randomHex}`;
};

// Schema for product creation
const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().or(z.number()).refine(value => {
    const price = typeof value === "string" ? parseFloat(value) : value;
    return !isNaN(price) && price >= 0;
  }, "Price must be a valid positive number"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  lowStockThreshold: z.string().optional().refine(value => {
    if (!value) return true;
    const threshold = parseInt(value);
    return !isNaN(threshold) && threshold >= 0;
  }, "Low stock threshold must be a valid positive number"),
  priceStrategy: z.string().optional()
});

// Function to save uploaded image to the file system
const saveImage = async (image: File): Promise<string> => {
  const bytes = await image.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  // Create a unique filename
  const uniqueFilename = `${Date.now()}_${image.name.replace(/\s+/g, '_')}`;
  const imagePath = path.join(process.cwd(), 'public', 'images', 'products', uniqueFilename);
  
  // Ensure the directory exists
  const dir = path.dirname(imagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the file
  fs.writeFileSync(imagePath, buffer);
  console.log(`[API Products] Image saved to: ${imagePath}`);
  
  // Return the public URL
  return `/images/products/${uniqueFilename}`;
};

// GET - Obtener todos los productos
export async function GET() {
  try {
    // 1. Autenticar al usuario y obtener el storeId
    const authResult = await verifyAuth();
    if (!authResult || !authResult.userId) {
      console.error("Fallo de autenticación");
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere autenticación',
        products: [] 
      }, { status: 401 });
    }

    const userId = authResult.userId;
    console.log(`Usuario autenticado: ${userId}`);

    // Usar el storeId del token directamente
    if (!authResult.storeId) {
      console.error(`No se encontró storeId en el token para el usuario: ${userId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontró tienda asociada al token',
        products: []
      }, { status: 404 });
    }

    const storeId = authResult.storeId;
    console.log(`Obteniendo productos para tienda: ${storeId}`);

    // 3. Obtener productos asociados a la tienda del usuario
    const products = await prisma.product.findMany({
      where: {
        storeId,
        isDeleted: false
      },
      include: {
        categoryObj: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Se encontraron ${products.length} productos para la tienda ${storeId}`);
    
    // Log de los IDs de los productos para debug
    if (products.length > 0) {
      console.log('Productos encontrados:');
      products.forEach(product => {
        console.log(`ID: ${product.id}, Nombre: ${product.name}, storeId: ${product.storeId}`);
      });
    } else {
      console.log('No se encontraron productos para esta tienda');
    }

    // Siempre devolver la misma estructura, incluso si no hay productos
    return NextResponse.json({
      success: true,
      products: products || []
    });

  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener productos',
      details: error instanceof Error ? error.message : 'Error desconocido',
      products: []
    }, { status: 500 });
  }
}

// POST - Create a new product
export async function POST(req: NextRequest) {
  try {
    console.log("[API Products] Creating new product");
    
    // Verify authentication
    const auth = await verifyAuth();
    
    if (!auth || !auth.storeId) {
      console.error("[API Products] Error de autenticación:", !auth ? "No auth" : "No storeId");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const storeId = auth.storeId;
    console.log(`[API Products] Usuario verificado con storeId: ${storeId}`);
    
    // Parse form data or JSON
    let formData: FormData;
    let imageUrl = null;
    
    // Check if the request is multipart form data
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      formData = await req.formData();
      
      // Handle image upload
      const image = formData.get("image") as File | null;
      if (image) {
        console.log(`[API Products] Processing image upload: ${image.name}`);
        try {
          // Save the image and get its URL
          imageUrl = await saveImage(image);
          console.log(`[API Products] Image saved, URL: ${imageUrl}`);
        } catch (error) {
          console.error("[API Products] Error saving image:", error);
          // Continue without image if there's an error
        }
      }
    } else {
      const jsonData = await req.json();
      formData = new FormData();
      
      // Convert JSON to FormData for consistent handling
      Object.entries(jsonData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }
    
    // Extract and validate data
    const productData = {
      name: formData.get("name") as string,
      price: formData.get("price") as string,
      categoryId: formData.get("categoryId") as string,
      description: formData.get("description") as string || undefined,
      lowStockThreshold: formData.get("lowStockThreshold") as string || undefined,
      priceStrategy: formData.get("priceStrategy") as string || undefined
    };
    
    console.log("[API Products] Validating product data:", productData);
    
    const validationResult = createProductSchema.safeParse(productData);
    
    if (!validationResult.success) {
      console.log("[API Products] Validation failed:", validationResult.error);
      return NextResponse.json({ 
        error: "Invalid product data", 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    // Check if the category exists and belongs to the store
    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId }
    });

    if (!category) {
      console.log(`[API Products] Category not found: ${productData.categoryId}`);
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.storeId !== storeId) {
      console.log(`[API Products] Category ${productData.categoryId} belongs to store ${category.storeId}, not ${storeId}`);
      return NextResponse.json({ error: "You don't have permission to use this category" }, { status: 403 });
    }

    // Generate a unique SKU
    const sku = await generateSKU(storeId, productData.name, category.name);
    console.log(`[API Products] Generated SKU: ${sku}`);
    
    // Create the product
    const price = parseFloat(productData.price);
    const lowStockThreshold = productData.lowStockThreshold 
      ? parseInt(productData.lowStockThreshold) 
      : undefined;
    
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        sku,
        price,
        category: category.name,
        categoryId: productData.categoryId,
        description: productData.description,
        imageUrl,
        priceStrategy: productData.priceStrategy,
        stock: 0, // Initial stock is 0
        lowStockThreshold,
        storeId
      }
    });
    
    console.log(`[API Products] Product created successfully: ${product.id}`);
    
    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      product
    });
  } catch (error) {
    console.error("[API Products] Error creating product:", error);
    return NextResponse.json({ 
      error: "Error creating product", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 