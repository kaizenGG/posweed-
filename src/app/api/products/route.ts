import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import fs from 'fs';
import path from 'path';
import { verifyAuth } from "@/lib/auth";
import sharp from 'sharp';

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

// Function to save uploaded image to the file system with optimization
const saveImage = async (image: File): Promise<string> => {
  try {
    console.log(`[API Products] Starting image upload process for ${image.name}, size: ${image.size} bytes`);
    
    if (!image.size || image.size === 0) {
      throw new Error("La imagen está vacía o corrupta");
    }
    
    // Leer datos de la imagen
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log(`[API Products] Successfully read image data, buffer length: ${buffer.length}`);
    
    // Create a unique filename with appropriate extension
    const timestamp = Date.now();
    const sanitizedName = image.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    
    // Crear nombre único para el archivo - usando la extensión original para mayor compatibilidad
    const originalExtension = path.extname(sanitizedName).toLowerCase() || '.jpg';
    const baseFilename = path.basename(sanitizedName, originalExtension);
    const uniqueFilename = `${timestamp}_${baseFilename}${originalExtension}`;
    
    const dirPath = path.join(process.cwd(), 'public', 'images', 'products');
    const imagePath = path.join(dirPath, uniqueFilename);
    
    // Ensure the directory exists
    console.log(`[API Products] Checking if directory exists: ${dirPath}`);
    if (!fs.existsSync(dirPath)) {
      console.log(`[API Products] Directory doesn't exist, creating it: ${dirPath}`);
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[API Products] Directory created successfully`);
      } catch (error: any) {
        console.error(`[API Products] Error creating directory: ${error}`);
        throw new Error(`No se pudo crear el directorio para guardar la imagen: ${error.message}`);
      }
    }
    
    // Método simple - guardar el archivo sin optimización
    // Este método es un fallback en caso de que la optimización falle
    const saveOriginalImage = () => {
      try {
        console.log(`[API Products] Saving original image without optimization to: ${imagePath}`);
        fs.writeFileSync(imagePath, buffer);
        
        // Verificar que el archivo se guardó correctamente
        if (fs.existsSync(imagePath)) {
          const stats = fs.statSync(imagePath);
          console.log(`[API Products] File verified on disk, size: ${stats.size} bytes`);
          
          if (stats.size === 0) {
            throw new Error("El archivo se creó pero está vacío");
          }
        } else {
          throw new Error("El archivo no se encontró después de escribirlo");
        }
        
        return `/images/products/${uniqueFilename}`;
      } catch (error: any) {
        console.error(`[API Products] Error saving original image: ${error}`);
        throw error;
      }
    };
    
    try {
      // Intentar usar Sharp para optimizar la imagen
      console.log(`[API Products] Attempting to optimize image using Sharp`);
      
      // Como sharp puede fallar en algunos entornos, lo envolvemos en un try-catch
      // y usamos el método simple como fallback
      const outputExtension = '.webp'; // Preferimos WebP para mejor compresión
      const optimizedFilename = `${timestamp}_${baseFilename}${outputExtension}`;
      const optimizedPath = path.join(dirPath, optimizedFilename);
      
      // Configure image optimization options
      const MAX_WIDTH = 1200;  // Tamaño máximo para ancho
      const MAX_HEIGHT = 1200; // Tamaño máximo para alto
      const QUALITY = 80;      // Calidad de compresión (0-100)
      
      // Procesamiento con Sharp para optimizar la imagen
      let sharpInstance = sharp(buffer);
      
      // Obtener metadatos para saber dimensiones originales
      const metadata = await sharpInstance.metadata();
      console.log(`[API Products] Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
      
      // Si la imagen es más grande que los límites, redimensionarla
      if ((metadata.width && metadata.width > MAX_WIDTH) || 
          (metadata.height && metadata.height > MAX_HEIGHT)) {
        console.log(`[API Products] Resizing image as it exceeds maximum dimensions`);
        sharpInstance = sharpInstance.resize({
          width: MAX_WIDTH,
          height: MAX_HEIGHT,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Convertir a WebP y aplicar compresión
      const optimizedImageBuffer = await sharpInstance
        .webp({ quality: QUALITY })
        .toBuffer();
      
      // Guardar la imagen optimizada
      console.log(`[API Products] Writing optimized image to: ${optimizedPath}`);
      fs.writeFileSync(optimizedPath, optimizedImageBuffer);
      
      const optimizedSize = optimizedImageBuffer.length;
      const compressionRatio = buffer.length > 0 ? ((buffer.length - optimizedSize) / buffer.length * 100).toFixed(2) : 0;
      console.log(`[API Products] Image optimized: original ${buffer.length} bytes, optimized ${optimizedSize} bytes (${compressionRatio}% reduction)`);
      
      // Verificar que el archivo se guardó correctamente
      if (fs.existsSync(optimizedPath)) {
        const stats = fs.statSync(optimizedPath);
        console.log(`[API Products] Optimized file verified on disk, size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          throw new Error("El archivo optimizado se creó pero está vacío");
        }
      } else {
        throw new Error("El archivo optimizado no se encontró después de escribirlo");
      }
      
      // Return the public URL for the optimized image
      return `/images/products/${optimizedFilename}`;
      
    } catch (error: any) {
      console.error(`[API Products] Error optimizing image with Sharp: ${error}`);
      console.log(`[API Products] Falling back to standard image saving method`);
      
      // Si la optimización falla, usar el método simple
      return saveOriginalImage();
    }
    
  } catch (error) {
    console.error(`[API Products] Error in saveImage function: ${error}`);
    throw error; // Re-throw to be handled by caller
  }
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
    console.log("[API Products] Creating new product - Request started");
    
    // Verify authentication
    try {
      const auth = await verifyAuth();
      
      if (!auth || !auth.storeId) {
        console.error("[API Products] Error de autenticación:", !auth ? "No auth" : "No storeId");
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      
      const storeId = auth.storeId;
      console.log(`[API Products] Usuario verificado con storeId: ${storeId}`);
    } catch (authError: any) {
      console.error("[API Products] Error en autenticación:", authError);
      return NextResponse.json({ 
        error: "Error de autenticación", 
        details: authError instanceof Error ? authError.message : "Error desconocido"
      }, { status: 401 });
    }
    
    const auth = await verifyAuth();
    if (!auth || !auth.storeId) {
      console.error("[API Products] Error de autenticación:", !auth ? "No auth" : "No storeId");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const storeId = auth.storeId;
    console.log(`[API Products] Usuario verificado con storeId: ${storeId}`);
    
    // Parse form data or JSON
    let formData: FormData;
    let imageUrl: string | null = null;
    
    // Detect content type more robustly
    const contentType = req.headers.get("content-type") || "";
    console.log(`[API Products] Request content type: ${contentType}`);
    
    // Robust detection for multipart/form-data
    const isMultipartForm = contentType.toLowerCase().includes("multipart/form-data");
    
    if (isMultipartForm) {
      console.log("[API Products] Processing multipart form data");
      try {
        formData = await req.formData();
        console.log(`[API Products] Form data keys: ${[...formData.keys()].join(', ')}`);
        
        // Handle image upload
        const image = formData.get("image") as File | null;
        if (image && image.size > 0) {
          console.log(`[API Products] Found image in form data: ${image.name}, type: ${image.type}, size: ${image.size} bytes`);
          try {
            // Save the image and get its URL
            imageUrl = await saveImage(image);
            console.log(`[API Products] Image saved successfully, URL: ${imageUrl}`);
          } catch (imageError: any) {
            console.error("[API Products] Error saving image:", imageError);
            return NextResponse.json({ 
              error: "Error al guardar la imagen", 
              details: imageError instanceof Error ? imageError.message : "Error desconocido" 
            }, { status: 500 });
          }
        } else {
          console.log("[API Products] No image found in form data or image is empty");
        }
      } catch (formError: any) {
        console.error("[API Products] Error parsing form data:", formError);
        return NextResponse.json({ 
          error: "Error al procesar el formulario", 
          details: formError instanceof Error ? formError.message : "Error desconocido" 
        }, { status: 400 });
      }
    } else {
      console.log("[API Products] Processing JSON data");
      try {
        const jsonData = await req.json();
        console.log("[API Products] JSON data received:", JSON.stringify(jsonData).substring(0, 200) + "...");
        
        formData = new FormData();
        
        // Convert JSON to FormData for consistent handling
        Object.entries(jsonData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
      } catch (jsonError: any) {
        console.error("[API Products] Error parsing JSON data:", jsonError);
        return NextResponse.json({ 
          error: "Error al procesar los datos JSON", 
          details: jsonError instanceof Error ? jsonError.message : "Error desconocido" 
        }, { status: 400 });
      }
    }
    
    // Extract and validate data
    try {
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
      let category;
      try {
        category = await prisma.category.findUnique({
          where: { id: productData.categoryId }
        });
      } catch (dbError: any) {
        console.error("[API Products] Error al buscar la categoría en la base de datos:", dbError);
        return NextResponse.json({ 
          error: "Error en la base de datos", 
          details: dbError instanceof Error ? dbError.message : "Error desconocido" 
        }, { status: 500 });
      }

      if (!category) {
        console.log(`[API Products] Category not found: ${productData.categoryId}`);
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      if (category.storeId !== storeId) {
        console.log(`[API Products] Category ${productData.categoryId} belongs to store ${category.storeId}, not ${storeId}`);
        return NextResponse.json({ error: "You don't have permission to use this category" }, { status: 403 });
      }

      // Generate a unique SKU
      let sku;
      try {
        sku = await generateSKU(storeId, productData.name, category.name);
        console.log(`[API Products] Generated SKU: ${sku}`);
      } catch (skuError: any) {
        console.error("[API Products] Error al generar SKU:", skuError);
        return NextResponse.json({ 
          error: "Error al generar SKU", 
          details: skuError instanceof Error ? skuError.message : "Error desconocido" 
        }, { status: 500 });
      }
      
      // Create the product
      const price = parseFloat(productData.price);
      const lowStockThreshold = productData.lowStockThreshold 
        ? parseInt(productData.lowStockThreshold) 
        : undefined;
      
      let product;
      try {
        console.log(`[API Products] Creating product in database with name: ${productData.name}, price: ${price}, imageUrl: ${imageUrl || 'null'}`);
        product = await prisma.product.create({
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
      } catch (createError: any) {
        console.error("[API Products] Error al crear el producto en la base de datos:", createError);
        return NextResponse.json({ 
          error: "Error al crear el producto en la base de datos", 
          details: createError instanceof Error ? createError.message : "Error desconocido" 
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: "Product created successfully",
        product
      });
    } catch (validationError: any) {
      console.error("[API Products] Error en validación o procesamiento de datos:", validationError);
      return NextResponse.json({ 
        error: "Error en validación o procesamiento de datos", 
        details: validationError instanceof Error ? validationError.message : "Error desconocido" 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[API Products] Error general al crear producto:", error);
    return NextResponse.json({ 
      error: "Error creating product", 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 