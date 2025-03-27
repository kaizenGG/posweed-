import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { Sale, SaleItem, Product } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    console.log("[API Dashboard] Getting dashboard stats");
    
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Dashboard] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Dashboard] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Dashboard] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Dashboard] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Obtener información de la tienda activa
    const store = await prisma.store.findUnique({
      where: {
        id: storeId
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      }
    });
    
    if (!store) {
      console.log(`[API Dashboard] Store not found: ${storeId}`);
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }
    
    console.log(`[API Dashboard] Found store: ${store.name} (${store.id})`);
    
    // Contar productos
    const totalProducts = await prisma.product.count({
      where: {
        storeId: store.id,
      },
    });
    
    console.log(`[API Dashboard] Total products: ${totalProducts}`);
    
    // Obtener datos de ventas con productos
    const salesData = await prisma.sale.findMany({
      where: {
        storeId: store.id,
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    console.log(`[API Dashboard] Found ${salesData.length} sales`);
    
    const totalSales = salesData.reduce((sum, sale) => sum + sale.total, 0);
    
    // Obtener los productos más vendidos
    interface ProductSalesData {
      id: string;
      name: string;
      imageUrl: string | null;
      category: string;
      totalSold: number;
      revenue: number;
    }
    
    const productSales = new Map<string, ProductSalesData>();
    
    type SaleWithItems = Sale & {
      items: (SaleItem & {
        product: Product;
      })[];
    };
    
    // Analizar ventas para obtener productos más vendidos
    salesData.forEach((sale: SaleWithItems) => {
      sale.items.forEach((item) => {
        const productId = item.productId;
        const currentProduct = productSales.get(productId) || {
          id: productId,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          category: item.product.category || "Sin categoría",
          totalSold: 0,
          revenue: 0,
        };
        
        currentProduct.totalSold += item.quantity;
        currentProduct.revenue += item.price * item.quantity;
        
        productSales.set(productId, currentProduct);
      });
    });
    
    // Convertir a array y ordenar por revenue (ingresos)
    const topSellingProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 productos
    
    console.log(`[API Dashboard] Top selling products: ${topSellingProducts.length}`);
    
    // Preparar datos para ventas diarias (últimos 7 días)
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();
    
    const dailySales = last7Days.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      
      const dayTotal = salesData
        .filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= date && saleDate < nextDay;
        })
        .reduce((sum, sale) => sum + sale.total, 0);
      
      return {
        date: date.toISOString().split('T')[0],
        sales: dayTotal,
      };
    });
    
    console.log(`[API Dashboard] Generated daily sales data for ${dailySales.length} days`);
    
    return NextResponse.json({
      storeInfo: {
        name: store.name,
        status: store.status,
        createdAt: store.createdAt.toISOString(),
      },
      totalProducts,
      totalOrders: salesData.length,
      totalSales,
      topSellingProducts,
      dailySales,
    });
    
  } catch (error) {
    console.error("[API Dashboard] Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 