import { NextResponse } from "next/server";
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    console.log("[API Restock] Inicio de procesamiento de restock");
    
    // 1. Autenticar al usuario
    const authResult = await verifyAuth();
    if (!authResult || !authResult.userId) {
      console.log("[API Restock] Error de autenticación");
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const userId = authResult.userId;
    console.log(`[API Restock] Procesando solicitud para usuario: ${userId}`);

    // 2. Parsear y validar datos
    const body = await request.json();
    console.log("[API Restock] Datos recibidos:", JSON.stringify(body, null, 2));
    
    const { 
      productId, 
      quantity, 
      roomId, 
      cost, 
      supplierId, 
      invoiceNumber 
    } = body;

    // Validar campos requeridos
    if (!productId || !roomId) {
      console.log("[API Restock] Error: Falta productId o roomId", { productId, roomId });
      return NextResponse.json({ 
        success: false, 
        error: 'Se requieren ID de producto y ID de sala' 
      }, { status: 400 });
    }

    // Validar quantity y cost
    const numQuantity = Number(quantity);
    const numCost = cost ? Number(cost) : 0;

    if (isNaN(numQuantity) || numQuantity <= 0) {
      console.log("[API Restock] Error: Cantidad inválida", { quantity });
      return NextResponse.json({ 
        success: false, 
        error: 'La cantidad debe ser un número positivo' 
      }, { status: 400 });
    }

    if (isNaN(numCost) || numCost < 0) {
      console.log("[API Restock] Error: Costo inválido", { cost });
      return NextResponse.json({ 
        success: false, 
        error: 'El costo debe ser un número no negativo' 
      }, { status: 400 });
    }

    // 3. Obtener tienda del usuario
    const userStore = await prisma.store.findFirst({
      where: { userId }
    });

    if (!userStore) {
      console.log("[API Restock] Error: No se encontró tienda para el usuario", { userId });
      return NextResponse.json({ 
        success: false, 
        error: 'No se encontró tienda asociada al usuario' 
      }, { status: 404 });
    }

    const storeId = userStore.id;
    console.log(`[API Restock] Tienda identificada: ${storeId} (${userStore.name})`);

    // 4. Verificar que el producto existe y pertenece a la tienda
    console.log(`[API Restock] Buscando producto ID: "${productId}" para tienda: "${storeId}"`);
    
    // Primero, verificar si el producto existe en general
    const anyProduct = await prisma.product.findUnique({
      where: {
        id: productId
      }
    });
    
    if (!anyProduct) {
      console.log(`[API Restock] Error: Producto con ID ${productId} no existe`);
      return NextResponse.json({ 
        success: false, 
        error: 'Producto no encontrado en la base de datos' 
      }, { status: 404 });
    }

    console.log(`[API Restock] Producto encontrado: ${anyProduct.name}, stock actual: ${anyProduct.stock}`);
    
    // Intentar obtener la tienda a la que está asignado el usuario
    const userStores = await prisma.store.findMany({
      where: {
        userId: userId
      }
    });
    
    console.log(`[API Restock] Tiendas del usuario: ${userStores.length}`);
    
    // Verificar si el producto pertenece a alguna tienda del usuario
    let storeMatch = false;
    const productStoreId = String(anyProduct.storeId || '').trim();
    let matchedStore = null;
    
    for (const store of userStores) {
      const currentStoreId = String(store.id || '').trim();
      console.log(`[API Restock] Comparando con tienda: ${store.name}, ID: "${currentStoreId}"`);
      
      if (productStoreId === currentStoreId || anyProduct.storeId === store.id) {
        storeMatch = true;
        matchedStore = store;
        console.log(`[API Restock] ¡Coincidencia encontrada con tienda ${store.name}!`);
        break;
      }
    }
    
    if (!storeMatch || !matchedStore) {
      console.log(`[API Restock] Error: El producto no pertenece a ninguna tienda del usuario`);
      return NextResponse.json({ 
        success: false, 
        error: 'Producto no pertenece a ninguna de tus tiendas' 
      }, { status: 403 });
    }

    console.log("[API Restock] Verificación de tienda exitosa");
    const product = anyProduct;
    
    // Usar el storeId del producto para buscar la sala
    const productStore = matchedStore;
    const correctedStoreId = productStore.id;
    
    console.log(`[API Restock] Usando storeId ${correctedStoreId} para buscar la sala`);

    // 5. Verificar que la sala existe y pertenece a la tienda
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        storeId: correctedStoreId
      }
    });

    if (!room) {
      console.log(`[API Restock] Error: Sala con ID ${roomId} no encontrada para la tienda ${productStore.name}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Sala no encontrada o no asociada a tu tienda' 
      }, { status: 404 });
    }

    console.log(`[API Restock] Sala encontrada: ${room.name}`);
    console.log(`[API Restock] Reabasteciendo producto ${product.name} con ${numQuantity} unidades en sala ${room.name}`);

    // 6. Buscar item de inventario existente
    console.log(`[API Restock] Buscando item de inventario existente (productId: ${productId}, roomId: ${roomId}, storeId: ${correctedStoreId})`);
    let inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        roomId,
        storeId: correctedStoreId
      }
    });

    // 7. Actualizar o crear item de inventario
    if (inventoryItem) {
      console.log(`[API Restock] Actualizando item de inventario existente: ${inventoryItem.id} con cantidad actual: ${inventoryItem.quantity}`);
      
      // Calcular nuevo costo promedio
      const totalValue = (inventoryItem.quantity * (inventoryItem.avgCost || 0)) + (numQuantity * numCost);
      const newQuantity = inventoryItem.quantity + numQuantity;
      const newAvgCost = totalValue / newQuantity;

      console.log(`[API Restock] Cálculos para actualización:
        - Cantidad actual: ${inventoryItem.quantity}
        - Costo promedio actual: ${inventoryItem.avgCost || 0}
        - Cantidad a añadir: ${numQuantity}
        - Costo nuevo: ${numCost}
        - Nueva cantidad total: ${newQuantity}
        - Nuevo costo promedio: ${newAvgCost}
      `);

      // Actualizar item existente
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQuantity,
          avgCost: newAvgCost,
          updatedAt: new Date()
        }
      });
      
      console.log(`[API Restock] Item de inventario actualizado con nueva cantidad: ${newQuantity}, costo promedio: ${newAvgCost}`);
    } else {
      console.log('[API Restock] Creando nuevo item de inventario');
      
      // Crear nuevo item usando connect para relaciones
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          quantity: numQuantity,
          avgCost: numCost || (product.price * 0.6),
          product: { connect: { id: productId } },
          room: { connect: { id: roomId } },
          store: { connect: { id: correctedStoreId } }
        }
      });
      
      console.log(`[API Restock] Nuevo item de inventario creado: ${inventoryItem.id} con cantidad: ${inventoryItem.quantity}`);
    }

    // 8. Actualizar stock del producto
    console.log(`[API Restock] Actualizando stock del producto. Stock actual: ${product.stock}, incremento: ${numQuantity}`);
    
    // Obtener stock actual antes de la actualización para verificar después
    const currentStock = product.stock || 0;
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        stock: {
          increment: numQuantity
        },
        updatedAt: new Date()
      }
    });
    
    console.log(`[API Restock] Stock de producto actualizado de ${currentStock} a ${updatedProduct.stock} (incremento de ${numQuantity})`);
    
    // Verificación adicional para asegurar que el incremento fue aplicado correctamente
    if (updatedProduct.stock !== currentStock + numQuantity) {
      console.warn(`[API Restock] ADVERTENCIA: El incremento de stock parece incorrecto. 
        - Stock esperado: ${currentStock + numQuantity}
        - Stock actual: ${updatedProduct.stock}
      `);
    }

    // 9. Registrar transacción de inventario
    let transaction = null;
    try {
      console.log(`[API Restock] Registrando transacción de inventario`);
      transaction = await prisma.inventoryTransaction.create({
        data: {
          type: 'RESTOCK',
          quantity: numQuantity,
          cost: numCost,
          notes: `Reabastecimiento de ${numQuantity} unidades a €${numCost} cada una`,
          createdAt: new Date(),
          product: { connect: { id: productId } },
          room: { connect: { id: roomId } },
          inventoryItem: { connect: { id: inventoryItem.id } },
          store: { connect: { id: correctedStoreId } },
          ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
          invoiceNumber: invoiceNumber || ''
        }
      });
      
      console.log(`[API Restock] Transacción de inventario registrada: ${transaction.id}`);
    } catch (error) {
      console.error('[API Restock] Error al registrar transacción:', error);
      // Continuamos aunque falle el registro de la transacción
    }

    // 10. Devolver respuesta exitosa
    console.log('[API Restock] Restock completado exitosamente');
    return NextResponse.json({
      success: true,
      message: 'Producto reabastecido exitosamente',
      data: {
        inventoryItem,
        product: updatedProduct,
        transaction
      }
    });

  } catch (error) {
    console.error('[API Restock] Error inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 