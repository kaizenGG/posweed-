"use client";

import { useState, useEffect } from "react";
import { 
  Building, 
  PackageOpen, 
  History, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  BarChart2,
  ShoppingCart
} from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  storeInfo: {
    name: string;
    status: string;
    createdAt: string;
  };
  topSellingProducts: {
    id?: string;
    name?: string;
    imageUrl?: string;
    category: string;
    price?: number;
    totalSold: number;
    revenue: number;
  }[];
  dailySales: {
    date: string;
    sales: number;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  useEffect(() => {
    fetchDashboardStats();
  }, []);
  
  // Función para cargar los datos del dashboard
  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/dashboard/stats");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", errorData);
        throw new Error(`Error loading dashboard data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Dashboard data:", data);
      setStats(data);
    } catch (error) {
      console.error("Error loading statistics:", error);
      setError("Could not load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => fetchDashboardStats()}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md shadow">
        <p>No data available at this time.</p>
      </div>
    );
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Calculate percentage growth (placeholder)
  const calculateGrowth = () => {
    return "+12.5%";
  };
  
  // Ensure all required properties exist with defaults
  const safeStats = {
    ...stats,
    totalProducts: stats.totalProducts || 0,
    totalOrders: stats.totalOrders || 0,
    totalSales: stats.totalSales || 0,
    storeInfo: stats.storeInfo || { name: 'Store', status: 'UNKNOWN', createdAt: new Date().toISOString() },
    topSellingProducts: stats.topSellingProducts || [],
    dailySales: stats.dailySales || []
  };
  
  return (
    <div className="p-4 mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(safeStats.totalSales)}</p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>{calculateGrowth()} from last month</span>
              </div>
            </div>
            <div className="bg-indigo-50 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-bold mt-1">{safeStats.totalProducts}</p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+3 new this week</span>
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-full">
              <PackageOpen className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold mt-1">
                {safeStats.topSellingProducts && safeStats.topSellingProducts.length > 0 
                  ? safeStats.topSellingProducts.reduce((acc, product) => acc + (product.totalSold || 0), 0)
                  : safeStats.totalOrders || 0
                }
              </p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+8.5% from yesterday</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Store Status</p>
              <p className="text-2xl font-bold mt-1">{safeStats.storeInfo.status === "ACTIVE" ? "Active" : "Inactive"}</p>
              <div className="flex items-center mt-2 text-sm text-gray-600">
                <span>Since {new Date(safeStats.storeInfo.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-full">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart Section */}
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Sales Overview</h2>
              <select className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            
            {/* Sales Chart Visualization */}
            <div className="h-64 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
              {safeStats.dailySales && safeStats.dailySales.length > 0 ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 px-4 pt-4 pb-2 relative">
                    {/* Líneas de referencia horizontales */}
                    <div className="absolute inset-x-0 h-full flex flex-col justify-between px-2 pointer-events-none">
                      {[0, 1, 2, 3].map((_, i) => {
                        const maxSale = Math.max(...safeStats.dailySales.map(d => d.sales), 10);
                        const value = maxSale * (3-i) / 3;
                        return (
                          <div key={i} className="w-full h-px bg-gray-100 flex items-center">
                            <span className="text-xs text-gray-400 ml-1">
                              {i === 0 ? '' : formatCurrency(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Barras de ventas */}
                    <div className="absolute inset-0 flex items-end justify-around px-4 pt-8 pb-6">
                      {safeStats.dailySales.map((day, index) => {
                        // Encuentra el valor máximo para la escala
                        const maxSale = Math.max(...safeStats.dailySales.map(d => d.sales), 1);
                        // Calcula el porcentaje de altura (mínimo 4% para barras con valores pequeños)
                        const heightPercent = Math.max(4, (day.sales / maxSale) * 90);
                        
                        return (
                          <div key={index} className="relative flex flex-col items-center justify-end group h-full px-1">
                            {/* Valor de venta sobre la barra al pasar el cursor */}
                            <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              {formatCurrency(day.sales)}
                            </div>
                            {/* Barra de venta */}
                            <div 
                              className={`w-8 md:w-12 ${day.sales > 0 ? 'bg-blue-500' : 'bg-gray-200'} rounded-t-sm group-hover:bg-blue-600 transition-colors`}
                              style={{ height: `${heightPercent}%` }}
                            >
                              <div className="h-full w-full flex flex-col justify-end">
                                {day.sales > 0 && (
                                  <div className="text-xs text-white font-medium px-1 pb-1 text-center opacity-75">
                                    {day.sales > maxSale * 0.15 ? formatCurrency(day.sales) : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Labels de días en la parte inferior */}
                  <div className="h-12 flex justify-around px-4 border-t border-gray-100">
                    {safeStats.dailySales.map((day, index) => {
                      const date = new Date(day.date);
                      // Obtener día de la semana y número de día
                      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayOfMonth = date.getDate();
                      
                      return (
                        <div key={index} className="flex flex-col items-center justify-center text-xs text-gray-500 px-1">
                          <span className="font-medium">{dayOfWeek}</span>
                          <span>{dayOfMonth}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No sales data available</p>
                    <p className="text-gray-400 text-sm">Start selling to see your sales chart</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Top Selling Products */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Top Selling Products</h2>
              <a href="/dashboard/products" className="text-blue-600 text-sm hover:underline">
                View All
              </a>
            </div>
            
            {!safeStats.topSellingProducts || safeStats.topSellingProducts.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p>No sales data available yet</p>
                <p className="text-sm mt-1">Start selling products to see stats</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sold
                      </th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {safeStats.topSellingProducts.map((product, index) => (
                      <tr key={product.id || index}>
                        <td className="py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0 mr-2">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-8 w-8 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                                  {product.name?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.name || 'Unknown product'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {product.category || 'Uncategorized'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 whitespace-nowrap text-right text-sm font-medium">
                          {product.totalSold}
                        </td>
                        <td className="py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 