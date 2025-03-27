"use client";

import { useState, useEffect } from "react";
import { Search, Filter, FileDown, Calendar, CreditCard, Wallet, Smartphone, MonitorSmartphone, ArrowUpDown, Eye } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";

// Interfaces
interface SaleItem {
  id: string;
  productId: string;
  product: {
    name: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  invoiceNumber: string;
  total: number;
  subtotal?: number;
  tax?: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  status: string;
  createdAt: string;
  taxId?: string;
  cashierName?: string;
  deviceName?: string;
  saleType?: string;
  items: SaleItem[];
  store: {
    name: string;
    address?: string;
  };
}

export default function SalesPage() {
  // States
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeTab, setActiveTab] = useState<'bills' | 'products' | 'categories'>('bills');
  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Load sales when component mounts
  useEffect(() => {
    fetchSales();
  }, [dateRange]);
  
  // Function to fetch sales
  const fetchSales = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query string for date filters
      const params = new URLSearchParams({
        startDate: `${dateRange.startDate}T00:00:00.000Z`,
        endDate: `${dateRange.endDate}T23:59:59.999Z`
      });
      
      const response = await fetch(`/api/sales?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error loading sales");
      }
      
      const data = await response.json();
      setSales(data.sales || []);
      
    } catch (error) {
      console.error("Error loading sales:", error);
      setError(error instanceof Error ? error.message : "Error loading sales");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to format dates
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MM/dd/yyyy, HH:mm", { locale: enUS });
  };
  
  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Function to display color and class based on payment method
  const getPaymentMethodStyle = (method: string) => {
    switch (method) {
      case 'cash':
        return {
          bgColor: 'bg-emerald-100',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-600',
          label: 'Cash',
          icon: <Wallet className="h-3 w-3 mr-1" />
        };
      case 'card':
        return {
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-600',
          label: 'Card',
          icon: <CreditCard className="h-3 w-3 mr-1" />
        };
      case 'promptpay':
        return {
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-600',
          label: 'PromptPay',
          icon: <Smartphone className="h-3 w-3 mr-1" />
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          label: method,
          icon: null
        };
    }
  };

  // Function to get style based on sale type
  const getSaleTypeStyle = (saleType: string = 'retail') => {
    switch (saleType) {
      case 'wholesale':
        return {
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-600',
          label: 'Wholesale'
        };
      case 'retail':
      default:
        return {
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-600',
          label: 'Retail'
        };
    }
  };
  
  // Function to filter sales by search
  const filteredSales = sales.filter(sale => {
    // If no search, show all
    if (!searchQuery) return true;
    
    // Search by invoice number
    if (sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    
    // Search by cashier
    if (sale.cashierName && sale.cashierName.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    
    // Search by store
    if (sale.store?.name && sale.store.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
    
    // Search in products
    return sale.items.some(item => 
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  
  // Sort sales
  const sortedSales = [...filteredSales].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortColumn) {
      case 'invoiceNumber':
        valueA = a.invoiceNumber;
        valueB = b.invoiceNumber;
        break;
      case 'store':
        valueA = a.store?.name || '';
        valueB = b.store?.name || '';
        break;
      case 'createdAt':
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
        break;
      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;
      case 'subtotal':
        valueA = a.subtotal || a.total;
        valueB = b.subtotal || b.total;
        break;
      case 'total':
        valueA = a.total;
        valueB = b.total;
        break;
      case 'paymentMethod':
        valueA = a.paymentMethod;
        valueB = b.paymentMethod;
        break;
      case 'cashReceived':
        valueA = a.cashReceived || 0;
        valueB = b.cashReceived || 0;
        break;
      case 'saleType':
        valueA = a.saleType || 'retail';
        valueB = b.saleType || 'retail';
        break;
      case 'cashier':
        valueA = a.cashierName || '';
        valueB = b.cashierName || '';
        break;
      default:
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
    }
    
    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
  
  // Function to change sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // Function to render sort arrow
  const renderSortArrow = (column: string) => {
    if (sortColumn === column) {
      return (
        <ArrowUpDown className="ml-1 h-4 w-4 inline" />
      );
    }
    return null;
  };
  
  // Calculate totals
  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSubtotal = filteredSales.reduce((sum, sale) => sum + (sale.subtotal || sale.total), 0);
  const totalCashReceived = filteredSales.reduce((sum, sale) => sum + (sale.cashReceived || 0), 0);
  
  return (
    <div className="p-4 mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">Sales</h1>
      
      {/* Top filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Date selector */}
        <div className="flex items-center p-2 bg-white border border-gray-300 rounded-md">
          <Calendar className="mr-2 h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border-0 focus:ring-0 text-sm"
          />
          <span className="mx-2 text-gray-500">-</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border-0 focus:ring-0 text-sm"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('bills')}
            className={`py-2 px-1 -mb-px font-medium text-sm relative ${
              activeTab === 'bills'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By Invoices
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-2 px-1 -mb-px font-medium text-sm relative ${
              activeTab === 'products'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By Products
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 -mb-px font-medium text-sm relative ${
              activeTab === 'categories'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By Categories
          </button>
        </div>
      </div>
      
      {/* Search bar and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by invoice, customer or store"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        
        <div className="flex space-x-2">
          <button className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            <Filter className="mr-2 h-4 w-4" />
            <span>Filters</span>
          </button>
          <button className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
            <FileDown className="mr-2 h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      {/* Sales table */}
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          {error}
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white p-8 rounded-md shadow text-center">
          <h3 className="text-lg font-medium text-gray-900">No sales found</h3>
          <p className="mt-2 text-gray-500">
            Try different filters or date range.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('invoiceNumber')}>
                    Invoice {renderSortArrow('invoiceNumber')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('storeName')}>
                    Store {renderSortArrow('storeName')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                    Date {renderSortArrow('createdAt')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('subtotal')}>
                    Subtotal {renderSortArrow('subtotal')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total')}>
                    Total {renderSortArrow('total')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('paymentMethod')}>
                    Method {renderSortArrow('paymentMethod')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('cashReceived')}>
                    Cash {renderSortArrow('cashReceived')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('saleType')}>
                    Type {renderSortArrow('saleType')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('cashierName')}>
                    Cashier {renderSortArrow('cashierName')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('deviceName')}>
                    Device {renderSortArrow('deviceName')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Total row */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {filteredSales.length} invoices
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(totalSubtotal)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(totalCashReceived)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                  <td className="px-4 py-3 text-sm text-gray-500"></td>
                </tr>

                {/* Sales rows */}
                {sortedSales.map((sale) => {
                  const paymentStyle = getPaymentMethodStyle(sale.paymentMethod);
                  const typeStyle = getSaleTypeStyle(sale.saleType);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <Link 
                          href={`/dashboard/invoice/${sale.id}`}
                          className="font-medium text-blue-600 hover:text-blue-900"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sale.store?.name || "PosWeed Store"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sale.status === 'COMPLETED' ? 'Completed' : sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(sale.subtotal || sale.total)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(sale.total)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStyle.bgColor} ${paymentStyle.textColor}`}>
                          {paymentStyle.icon}
                          {paymentStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sale.cashReceived ? formatCurrency(sale.cashReceived) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeStyle.bgColor} ${typeStyle.textColor}`}>
                          {typeStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sale.cashierName || "Admin"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {sale.deviceName || "Web POS"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Link 
                          href={`/dashboard/invoice/${sale.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 