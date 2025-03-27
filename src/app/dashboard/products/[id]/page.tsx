"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku: string;
  category?: string;
  imageUrl?: string;
  stock: number;
  lowStockThreshold?: number;
  categoryObj?: {
    name: string;
    color: string;
  };
}

interface Room {
  id: string;
  name: string;
  description?: string;
  forSale: boolean;
}

interface InventoryItem {
  id: string;
  productId: string;
  roomId: string;
  quantity: number;
  avgCost: number;
  room: Room;
}

interface InventoryLog {
  type: string;
  date: string;
  product: string;
  initialStock: string;
  quantity: string;
  currentStock: string;
  roomFrom: string;
}

interface ProductDetails {
  product: Product;
  inventory: {
    items: InventoryItem[];
    totalQuantity: number;
    avgCost: number;
    totalValue: number;
  };
  logs: InventoryLog[];
}

export default function ProductPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProductDetails | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("Kiu Branch");

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch product details");
        }
        const productData = await response.json();
        setData(productData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RESTOCK':
        return 'bg-green-100 text-green-800';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800';
      case 'ADJUSTMENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'SALE':
        return 'bg-red-100 text-red-800';
      case 'Reconcile Approve':
        return 'bg-purple-100 text-purple-800';
      case 'Sale Create':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!data) return <div className="p-4">No data found</div>;

  const { product, inventory, logs } = data;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/products" className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Go back</span>
          </Link>
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option>Kiu Branch</option>
          </select>
        </div>
      </div>

      {/* Product Info */}
      <div className="flex gap-4 bg-white rounded-lg border p-4">
        <div className="w-1/4">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              width={200}
              height={200}
              className="rounded-lg object-cover"
            />
          )}
        </div>
        <div className="w-3/4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold">{product.name}</h1>
              <p className="text-sm text-gray-600">{product.description}</p>
            </div>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              {product.categoryObj?.name || product.category || "Uncategorized"}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">Price</div>
              <div className="text-sm font-semibold">{formatCurrency(product.price)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">SKU</div>
              <div className="text-sm font-semibold">{product.sku}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Stock</div>
              <div className="text-sm font-semibold">{inventory.totalQuantity}g</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Avg. Cost</div>
              <div className="text-sm font-semibold">{formatCurrency(inventory.avgCost)}</div>
            </div>
          </div>

          {/* Flowers Pricing */}
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold">Flowers Pricing</h3>
              <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Product Pricing
              </div>
            </div>
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500">0.5g</div>
                <div className="text-sm font-semibold">{formatCurrency(product.price * 0.5)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">1g</div>
                <div className="text-sm font-semibold">{formatCurrency(product.price)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">3g</div>
                <div className="text-sm font-semibold">{formatCurrency(product.price * 2.75)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">5g</div>
                <div className="text-sm font-semibold">{formatCurrency(product.price * 4)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">10g</div>
                <div className="text-sm font-semibold">{formatCurrency(product.price * 7.4)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {inventory.items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium text-sm">{item.room.name}</h4>
                {item.room.forSale && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    For Sale
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-xs text-gray-500">Quantity</div>
                <div className="font-medium">{item.quantity}g</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Est. Cost</div>
                <div className="font-medium">{formatCurrency(item.avgCost * item.quantity)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Est. Value</div>
                <div className="font-medium">{formatCurrency(product.price * item.quantity)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory Logs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
          <h3 className="text-sm font-semibold">Inventory Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Initial Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Room (from)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                    {new Date(log.date).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">{log.product}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{log.initialStock}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{log.quantity}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{log.currentStock}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">{log.roomFrom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 