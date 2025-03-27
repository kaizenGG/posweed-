"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Printer, CreditCard, Wallet, Smartphone, Download } from "lucide-react";

// Interfaces
interface SaleItem {
  id: string;
  productId: string;
  product: {
    name: string;
    price: number;
    imageUrl?: string;
    category?: string;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  status: string;
  createdAt: string;
  taxId?: string;
  cashierName?: string;
  items: SaleItem[];
  store: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    image?: string;
  };
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchSaleDetails();
  }, [id]);

  const fetchSaleDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sales/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error loading invoice");
      }

      const data = await response.json();
      setSale(data.sale);
    } catch (error) {
      console.error("Error loading invoice:", error);
      setError(error instanceof Error ? error.message : "Error loading invoice");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd/MM/yyyy 'at' HH:mm", { locale: es });
  };

  // Función para mostrar ícono de método de pago
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'card':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'promptpay':
        return <Smartphone className="h-5 w-5 text-purple-600" />;
      default:
        return null;
    }
  };

  // Función para traducir el método de pago
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'promptpay':
        return 'PromptPay';
      default:
        return method;
    }
  };

  // Función para imprimir la factura
  const printInvoice = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="p-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          <span>Go back</span>
        </button>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          {error || "Could not load invoice"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Botón de retorno y acciones */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          <span>Go back</span>
        </button>
        <div className="flex space-x-2">
          <button 
            onClick={printInvoice}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            <span>Print</span>
          </button>
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            <Download className="mr-2 h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Factura */}
      <div className="bg-white rounded-lg shadow overflow-hidden p-8">
        {/* Encabezado de la factura */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          {/* Logo y datos de la tienda */}
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-800">{sale.store.name}</h1>
            {sale.store.address && (
              <p className="text-gray-600">{sale.store.address}</p>
            )}
            {sale.store.phone && (
              <p className="text-gray-600">Tel: {sale.store.phone}</p>
            )}
            {sale.store.email && (
              <p className="text-gray-600">{sale.store.email}</p>
            )}
          </div>

          {/* Número de factura e información */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Invoice #{sale.invoiceNumber}
            </h2>
            <p className="text-gray-600 mb-2">
              Date: {formatDate(sale.createdAt)}
            </p>
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Payment status:</span>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                Paid
              </span>
            </div>
            {sale.taxId && (
              <p className="text-gray-600 mt-2">
                Tax ID: {sale.taxId}
              </p>
            )}
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {item.product.imageUrl && (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="h-10 w-10 rounded-md object-cover mr-3"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.product.name}
                        </div>
                        {item.product.category && (
                          <div className="text-xs text-gray-500">
                            {item.product.category}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    ฿{item.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ฿{item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen de la factura */}
        <div className="flex flex-col md:flex-row justify-between mb-6">
          {/* Información de pago */}
          <div className="mb-6 md:mb-0">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Payment information</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium mr-2">Method:</span>
                <div className="flex items-center">
                  {getPaymentMethodIcon(sale.paymentMethod)}
                  <span className="ml-1 text-gray-800">{getPaymentMethodName(sale.paymentMethod)}</span>
                </div>
              </div>
              
              {sale.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Cash received:</span>
                    <span className="font-medium">฿{sale.cashReceived?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-medium">฿{sale.change?.toFixed(2) || '0.00'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Totales */}
          <div className="md:w-1/3">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Summary</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">฿{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">VAT</span>
                <span className="font-medium">฿0.00</span>
              </div>
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Total</span>
                <span className="font-bold text-gray-900">฿{sale.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <div className="flex justify-between text-gray-600 text-sm">
            <span>Cashier: {sale.cashierName || 'Admin'}</span>
            <span>Sale ID: {sale.id}</span>
          </div>
          <p className="text-gray-500 text-sm mt-2 text-center">
            Thank you for your purchase
          </p>
        </div>
      </div>
    </div>
  );
} 