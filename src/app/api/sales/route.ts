import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuthToken } from "@/lib/auth";

const prisma = new PrismaClient();

// Función para generar número de factura formateado (4 dígitos)
function formatInvoiceNumber(counter: number): string {
  return counter.toString().padStart(4, '0');
}

// GET - Obtener ventas
export async function GET(req: Request) {
  console.log("[API Sales] Getting sales");
  
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
    
    // Obtener parámetros de filtro (si existen)
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Construir el filtro de fechas si es necesario
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
    }
    
    // Obtener ventas para la tienda
    const sales = await prisma.sale.findMany({
      where: {
        storeId,
        ...dateFilter
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
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`[API Sales] Found ${sales.length} sales for store ${storeId}`);
    
    return NextResponse.json({ sales });
  } catch (error) {
    console.error("[API Sales] Error:", error);
    return NextResponse.json(
      { error: "Error obteniendo ventas" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva venta
export async function POST(req: Request) {
  console.log("[API Sales] POST request received");
  
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
    
    const { storeId, userId } = authResult;
    console.log(`[API Sales] Verified user with storeId: ${storeId}`);
    
    if (!storeId) {
      return NextResponse.json(
        { error: "No store ID associated with this user" },
        { status: 400 }
      );
    }
    
    // Obtener datos de la venta
    const data = await req.json();
    const { items, total, paymentMethod, cashReceived, change } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requieren artículos para crear una venta" },
        { status: 400 }
      );
    }
    
    // Crear venta con transacción para asegurar integridad
    const sale = await prisma.$transaction(
      async (tx) => {
        // 1. Obtener e incrementar el contador de facturas de la tienda
        const store = await tx.store.update({
          where: { id: storeId },
          data: { 
            invoiceCounter: { 
              increment: 1 
            } 
          },
          select: {
            id: true,
            name: true,
            invoiceCounter: true
          }
        });
        
        console.log(`[API Sales] Incremented invoice counter for store ${store.name} to ${store.invoiceCounter}`);
        
        // Generar número de factura
        const invoiceNumber = formatInvoiceNumber(store.invoiceCounter);
        console.log(`[API Sales] Generated invoice number: ${invoiceNumber}`);
        
        // 2. Crear la venta con el número de factura
        const newSale = await tx.sale.create({
          data: {
            storeId,
            invoiceNumber,
            total,
            paymentMethod,
            cashReceived: cashReceived || null,
            change: change || null,
            taxId: "0105566181057", // Número de identificación fiscal por defecto
            status: 'COMPLETED',
          }
        });
        
        // 3. Crear los elementos de la venta
        const saleItems = [];
        for (const item of items) {
          const { productId, quantity, price } = item;
          
          // Logging detallado para diagnóstico
          console.log(`[API Sales] Verificando producto con ID: "${productId}" para tienda: "${storeId}"`);
          
          // Primero verificar si el producto existe en general
          const anyProduct = await tx.product.findUnique({
            where: {
              id: productId
            }
          });
          
          if (!anyProduct) {
            console.log(`[API Sales] Producto con ID ${productId} no existe en la base de datos`);
            throw new Error(`Producto con ID ${productId} no encontrado en la base de datos`);
          }
          
          console.log(`[API Sales] Producto encontrado: ${anyProduct.name}, storeId: "${anyProduct.storeId}"`);
          
          // Verificar si el producto pertenece a la tienda actual o a cualquier tienda del usuario
          // Nota: En este contexto de transacción, podemos usar el storeId directamente porque viene del token verificado
          
          // Convertir IDs a string para comparación segura
          const productStoreId = String(anyProduct.storeId || '').trim();
          const userStoreId = String(storeId || '').trim();
          
          console.log(`[API Sales] Comparación de IDs: "${productStoreId}" === "${userStoreId}" es ${productStoreId === userStoreId}`);
          
          // Verificar si el producto pertenece a la tienda
          if (productStoreId !== userStoreId && anyProduct.storeId !== storeId) {
            console.log(`[API Sales] El producto existe pero pertenece a otra tienda. Producto storeId: "${productStoreId}", Usuario storeId: "${userStoreId}"`);
            
            // Intentar buscar todas las tiendas del usuario fuera de la transacción
            const userStores = await prisma.store.findMany({
              where: {
                id: anyProduct.storeId,
                userId
              }
            });
            
            // Si el producto pertenece a alguna otra tienda del usuario, permitir la venta
            if (userStores.length === 0) {
              throw new Error(`Producto con ID ${productId} no pertenece a ninguna de tus tiendas`);
            }
            
            console.log(`[API Sales] Producto encontrado en otra tienda del mismo usuario: ${userStores[0].name}`);
          }
          
          // Si llegamos aquí, el producto existe y pertenece a alguna tienda del usuario
          console.log(`[API Sales] Verificación exitosa - El producto ${anyProduct.name} es válido para la venta`);
          const product = anyProduct;
          
          // Verificar inventario disponible antes de crear la venta
          const availableInventory = await tx.inventoryItem.findMany({
            where: {
              productId,
              storeId,
              room: {
                forSale: true
              }
            },
            include: {
              room: true
            },
            orderBy: {
              quantity: 'desc' // Primero las que tienen más cantidad
            }
          });
          
          // Calcular inventario total disponible
          const totalAvailable = availableInventory.reduce((sum, item) => sum + item.quantity, 0);
          
          if (totalAvailable < quantity) {
            throw new Error(`No hay suficiente inventario disponible para el producto ${product.name}. Disponible: ${totalAvailable}, Solicitado: ${quantity}`);
          }
          
          // Crear el elemento de venta
          const saleItem = await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId,
              quantity,
              price,
              subtotal: price * quantity,
            }
          });
          
          saleItems.push(saleItem);
          
          // Actualizar el inventario en las salas marcadas para venta (forSale = true)
          // 1. Buscar las salas de venta que tengan este producto
          const inventoryItems = await tx.inventoryItem.findMany({
            where: {
              productId,
              storeId,
              room: {
                forSale: true
              }
            },
            include: {
              room: true
            },
            orderBy: {
              quantity: 'desc' // Primero las que tienen más cantidad
            }
          });
          
          // Si no hay inventario en salas de venta, registramos una advertencia
          if (inventoryItems.length === 0) {
            console.warn(`[API Sales] Product ${productId} not found in any sales room inventory`);
          }
          
          // 2. Restar la cantidad vendida del inventario disponible
          let remainingQuantity = quantity;
          
          for (const invItem of inventoryItems) {
            if (remainingQuantity <= 0) break;
            
            // Calculamos cuánto podemos restar de este item de inventario
            const quantityToDeduct = Math.min(remainingQuantity, invItem.quantity);
            remainingQuantity -= quantityToDeduct;
            
            if (quantityToDeduct > 0) {
              // Actualizar el item de inventario
              await tx.inventoryItem.update({
                where: { id: invItem.id },
                data: {
                  quantity: {
                    decrement: quantityToDeduct
                  }
                }
              });
              
              // Registrar la transacción de inventario
              await tx.inventoryTransaction.create({
                data: {
                  type: "SALE",
                  productId,
                  roomId: invItem.roomId,
                  storeId,
                  inventoryItemId: invItem.id,
                  quantity: quantityToDeduct,
                  cost: invItem.avgCost,
                  notes: `Sale #${newSale.invoiceNumber}`
                }
              });
              
              console.log(`[API Sales] Deducted ${quantityToDeduct} from inventory in room ${invItem.room.name}`);
            }
          }
          
          // Si aún queda cantidad por descontar, registramos una advertencia
          if (remainingQuantity > 0) {
            console.warn(`[API Sales] Insufficient inventory for product ${productId}, sold ${quantity} but only deducted ${quantity - remainingQuantity} from inventory`);
          }
        }
        
        return {
          ...newSale,
          items: saleItems
        };
      }, 
      {
        // Aumentar el timeout a 10 segundos para manejar transacciones más complejas
        timeout: 10000
      }
    );
    
    console.log(`[API Sales] Sale created successfully with ID: ${sale.id} and invoice number: ${sale.invoiceNumber}`);
    
    return NextResponse.json({
      success: true,
      sale
    });
  } catch (error) {
    console.error("[API Sales] Error creating sale:", error);
    return NextResponse.json(
      { error: "Error al crear la venta" },
      { status: 500 }
    );
  }
} 