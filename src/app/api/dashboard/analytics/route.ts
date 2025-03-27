import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { format, eachDayOfInterval, startOfDay, endOfDay, subDays, parseISO, addHours } from "date-fns";

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Definir interfaces para los datos de analytics
interface DaySalesData {
  date: string;
  revenue: number;
  salesCount: number;
}

interface WeekdayData {
  day: string;
  revenue: number;
  salesCount: number;
}

interface HourlyData {
  hour: number;
  revenue: number;
  salesCount: number;
}

interface InventoryCategoryData {
  name: string;
  cost: number;
  value: number;
  quantity: number;
  productCount: number;
}

interface AnalyticsData {
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number | null;
  dailySales: DaySalesData[];
  weekdayData: WeekdayData[];
  hourlyData: HourlyData[];
  inventoryCost?: number;
  inventoryValue?: number;
  inventoryByCategory?: InventoryCategoryData[];
}

interface TokenPayload {
  id: string;
  role: string;
  storeId: string;
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Analytics] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string | null = null;
    let payload: TokenPayload;
    
    try {
      payload = await verifyJwtAccessToken(token) as TokenPayload;
      
      if (!payload) {
        console.log("[API Analytics] Invalid token payload");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Analytics] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Analytics] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const searchParams = req.nextUrl.searchParams;
    const requestedStoreId = searchParams.get("storeId");
    const includeInventory = searchParams.get("includeInventory") === "true";
    
    // Si se solicita una tienda específica, usar esa; de lo contrario, usar la tienda del usuario
    const targetStoreId = requestedStoreId === "all" ? null : (requestedStoreId || storeId);
    
    // Fechas
    let startDate = searchParams.get("startDate") 
      ? parseISO(searchParams.get("startDate") as string)
      : subDays(new Date(), 7);
      
    let endDate = searchParams.get("endDate")
      ? parseISO(searchParams.get("endDate") as string)
      : new Date();
    
    // Ajustar para abarcar todo el día
    startDate = startOfDay(startDate);
    endDate = endOfDay(endDate);
    
    console.log(`[API Analytics] Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // Construir la condición de consulta para las ventas
    const salesWhereCondition = targetStoreId
      ? { storeId: targetStoreId, createdAt: { gte: startDate, lte: endDate } }
      : { createdAt: { gte: startDate, lte: endDate } };

    // 1. Obtener todas las ventas en el rango de fechas
    let sales = await prisma.sale.findMany({
      where: salesWhereCondition,
      include: {
        items: true
      }
    });
    
    console.log(`[API Analytics] Found ${sales.length} sales in database`);

    // 2. Calcular métricas básicas
    let totalRevenue = 0;
    let totalCost = 0;

    // Mapa para almacenar datos por día de la semana
    const weekdayDataMap: Record<string, WeekdayData> = DAYS_OF_WEEK.reduce((acc: Record<string, WeekdayData>, day) => {
      acc[day] = { day, revenue: 0, salesCount: 0 };
      return acc;
    }, {});

    // Mapa para almacenar datos por hora
    const hourlyDataMap: Record<number, HourlyData> = Array.from({ length: 24 }).reduce((acc: Record<number, HourlyData>, _, hour) => {
      acc[hour] = { hour, revenue: 0, salesCount: 0 };
      return acc;
    }, {});

    // Datos diarios para el rango de fechas
    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    const dailySalesMap: Record<string, DaySalesData> = daysInRange.reduce((acc: Record<string, DaySalesData>, date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      acc[dateStr] = { date: dateStr, revenue: 0, salesCount: 0 };
      return acc;
    }, {});

    // Procesar cada venta
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt);
      const dayOfWeek = DAYS_OF_WEEK[saleDate.getDay()];
      const hour = saleDate.getHours();
      const dateStr = format(saleDate, 'yyyy-MM-dd');
      
      // Calcular total de la venta - corregir el tipado
      const saleTotal = typeof sale.total === 'number' 
        ? sale.total 
        : (typeof sale.total === 'object' && sale.total !== null)
          ? parseFloat(String(sale.total)) 
          : 0;
      
      // Para el costo, usamos un valor estimado basado en el margen
      // En una implementación real, esto podría extraerse de los datos de inventario
      // o usar un valor predeterminado basado en la categoría del producto
      let saleCost = 0;
      
      // Estimamos que el costo es aproximadamente el 50% del precio de venta
      // Esto es solo un ejemplo, en un sistema real se deberían usar costos reales
      saleCost = saleTotal * 0.5;
      
      // Acumular en totales
      totalRevenue += saleTotal;
      totalCost += saleCost;
      
      // Acumular en datos diarios
      if (dailySalesMap[dateStr]) {
        dailySalesMap[dateStr].revenue += saleTotal;
        dailySalesMap[dateStr].salesCount += 1;
      }
      
      // Acumular en datos por día de la semana
      if (weekdayDataMap[dayOfWeek]) {
        weekdayDataMap[dayOfWeek].revenue += saleTotal;
        weekdayDataMap[dayOfWeek].salesCount += 1;
      }
      
      // Acumular en datos por hora
      if (hourlyDataMap[hour]) {
        hourlyDataMap[hour].revenue += saleTotal;
        hourlyDataMap[hour].salesCount += 1;
      }
    });

    // Convertir mapas a arrays
    const dailySales = Object.values(dailySalesMap);
    const weekdayData = Object.values(weekdayDataMap);
    const hourlyData = Object.values(hourlyDataMap);

    // Calcular margen de beneficio
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? profit / totalRevenue : null;

    // Preparar respuesta
    const analyticsData: AnalyticsData = {
      revenue: totalRevenue,
      cost: totalCost,
      profit,
      profitMargin,
      dailySales,
      weekdayData,
      hourlyData
    };

    // Si se solicitaron datos de inventario, agregarlos a la respuesta
    if (includeInventory) {
      console.log(`[API Analytics] Including inventory data for ${targetStoreId ? `store ${targetStoreId}` : 'all stores'}`);
      
      try {
        // Datos de inventario agregados por categoría
        let inventoryData;
        
        if (targetStoreId) {
          // Obtener datos para una tienda específica
          inventoryData = await getInventoryDataByStore(targetStoreId);
        } else {
          // Obtener datos para todas las tiendas asociadas al usuario
          const userStores = await prisma.store.findMany({
            where: { userId: payload.id },
            select: { id: true }
          });
          
          const storeIds = userStores.map(store => store.id);
          inventoryData = await getInventoryDataByStores(storeIds);
        }
        
        // Agregar datos de inventario a la respuesta
        analyticsData.inventoryCost = inventoryData.totalCost;
        analyticsData.inventoryValue = inventoryData.totalValue;
        analyticsData.inventoryByCategory = inventoryData.categories;
        
        console.log(`[API Analytics] Inventory data added successfully with ${inventoryData.categories.length} categories`);
      } catch (inventoryError) {
        console.error('[API Analytics] Error fetching inventory data:', inventoryError);
        // No fallar toda la respuesta, solo omitir datos de inventario
      }
    }
    
    console.log(`[API Analytics] Generated analytics data with ${dailySales.length} days, ${hourlyData.length} hours`);
    console.log(`[API Analytics] Revenue summary: ${totalRevenue.toFixed(2)}€ / Cost: ${totalCost.toFixed(2)}€ / Profit: ${profit.toFixed(2)}€`);
    
    return NextResponse.json(analyticsData);
    
  } catch (error) {
    console.error("[API Analytics] Error generating analytics:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics data" },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener datos de inventario para una tienda específica
async function getInventoryDataByStore(storeId: string) {
  // Obtener todos los items de inventario de la tienda
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { storeId },
    include: {
      product: {
        include: { categoryObj: true }
      }
    }
  });
  
  // Calcular costo y valor total
  let totalCost = 0;
  let totalValue = 0;
  
  // Agrupar por categoría
  const categoriesMap: Record<string, {
    name: string,
    cost: number,
    value: number,
    quantity: number,
    products: Set<string>
  }> = {};
  
  for (const item of inventoryItems) {
    const itemCost = item.quantity * item.avgCost;
    const itemValue = item.quantity * item.product.price;
    
    totalCost += itemCost;
    totalValue += itemValue;
    
    // Categorizar
    const categoryName = item.product.categoryObj?.name || "Sin categoría";
    const categoryId = item.product.categoryId || "uncategorized";
    
    if (!categoriesMap[categoryId]) {
      categoriesMap[categoryId] = {
        name: categoryName,
        cost: 0,
        value: 0,
        quantity: 0,
        products: new Set()
      };
    }
    
    categoriesMap[categoryId].cost += itemCost;
    categoriesMap[categoryId].value += itemValue;
    categoriesMap[categoryId].quantity += item.quantity;
    categoriesMap[categoryId].products.add(item.productId);
  }
  
  // Convertir a array para la respuesta
  const categories = Object.values(categoriesMap).map(cat => ({
    name: cat.name,
    cost: cat.cost,
    value: cat.value,
    quantity: cat.quantity,
    productCount: cat.products.size
  }));
  
  return {
    totalCost,
    totalValue,
    categories: categories.sort((a, b) => b.value - a.value) // Ordenar por valor descendente
  };
}

// Función auxiliar para obtener datos de inventario para múltiples tiendas
async function getInventoryDataByStores(storeIds: string[]) {
  // Obtener todos los items de inventario de las tiendas especificadas
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { storeId: { in: storeIds } },
    include: {
      product: {
        include: { categoryObj: true }
      }
    }
  });
  
  // Calcular costo y valor total
  let totalCost = 0;
  let totalValue = 0;
  
  // Agrupar por categoría
  const categoriesMap: Record<string, {
    name: string,
    cost: number,
    value: number,
    quantity: number,
    products: Set<string>
  }> = {};
  
  for (const item of inventoryItems) {
    const itemCost = item.quantity * item.avgCost;
    const itemValue = item.quantity * item.product.price;
    
    totalCost += itemCost;
    totalValue += itemValue;
    
    // Categorizar
    const categoryName = item.product.categoryObj?.name || "Sin categoría";
    const categoryId = item.product.categoryId || "uncategorized";
    
    if (!categoriesMap[categoryId]) {
      categoriesMap[categoryId] = {
        name: categoryName,
        cost: 0,
        value: 0,
        quantity: 0,
        products: new Set()
      };
    }
    
    categoriesMap[categoryId].cost += itemCost;
    categoriesMap[categoryId].value += itemValue;
    categoriesMap[categoryId].quantity += item.quantity;
    categoriesMap[categoryId].products.add(item.productId);
  }
  
  // Convertir a array para la respuesta
  const categories = Object.values(categoriesMap).map(cat => ({
    name: cat.name,
    cost: cat.cost,
    value: cat.value,
    quantity: cat.quantity,
    productCount: cat.products.size
  }));
  
  return {
    totalCost,
    totalValue,
    categories: categories.sort((a, b) => b.value - a.value) // Ordenar por valor descendente
  };
} 