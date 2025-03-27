"use client";

import React, { useState, useEffect, useRef, RefObject } from "react";
import { Search, Plus, Minus, ShoppingCart, X, CreditCard, Wallet, Smartphone, Check, AlertCircle, Printer, Download, Eye } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

// Color options - match the ones from the categories page
const colorOptions = [
  { name: "green", class: "bg-green-200 text-green-800" },
  { name: "lime", class: "bg-lime-200 text-lime-800" },
  { name: "emerald", class: "bg-emerald-200 text-emerald-800" },
  { name: "orange", class: "bg-orange-200 text-orange-800" },
  { name: "teal", class: "bg-teal-200 text-teal-800" },
  { name: "sky", class: "bg-sky-200 text-sky-800" },
  { name: "purple", class: "bg-purple-200 text-purple-800" },
  { name: "yellow", class: "bg-yellow-200 text-yellow-800" },
  { name: "amber", class: "bg-amber-200 text-amber-800" },
  { name: "indigo", class: "bg-indigo-200 text-indigo-800" },
  { name: "gray", class: "bg-gray-200 text-gray-800" },
  { name: "pink", class: "bg-pink-200 text-pink-800" },
  { name: "red", class: "bg-red-200 text-red-800" },
  { name: "rose", class: "bg-rose-200 text-rose-800" },
  { name: "blue", class: "bg-blue-200 text-blue-800" },
];

// Helper function to get color class by name
const getColorClass = (colorName: string) => {
  return colorOptions.find(c => c.name === colorName)?.class || "bg-gray-200 text-gray-800";
};

// Interfaces
interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  category: string;
  description?: string;
  imageUrl?: string;
  stock: number;
  categoryId?: string;
  categoryObj?: {
    id: string;
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// Tipos de pago
type PaymentMethod = 'cash' | 'card' | 'promptpay';

// Componente para el ticket de compra
const TicketTemplate = React.forwardRef<HTMLDivElement, {
  saleData: any;
  storeInfo: any;
  cashReceived: string;
  change: number;
  paymentMethod: PaymentMethod;
}>(({ saleData, storeInfo, cashReceived, change, paymentMethod }, ref) => {
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div ref={ref} className="p-1 w-[80mm] bg-white text-black text-xs font-mono" style={{ fontFamily: 'monospace' }}>
      {/* Cabecera */}
      <div className="flex justify-center mb-2">
        {storeInfo?.image && (
          <div className="flex justify-center mb-2">
            <img src={storeInfo.image} alt="Logo" className="w-20 h-20 object-contain" />
          </div>
        )}
      </div>
      
      <div className="text-center">
        <p className="font-bold">{storeInfo?.name || "PosWeed"}</p>
        <p>{storeInfo?.address || ""}</p>
        {storeInfo?.phone && <p>Tel: {storeInfo.phone}</p>}
        {storeInfo?.email && <p>{storeInfo.email}</p>}
        <p>TAX ID: {storeInfo?.taxId || "0105567194501"}</p>
      </div>
      
      <div className="border-t border-b border-dashed border-gray-400 my-2 py-1">
        <p>Check-out Time: {formatDate(new Date())}</p>
        <p>Receipt No.: {saleData?.invoiceNumber || new Date().getTime().toString()}</p>
        <p>Cashier: {saleData?.cashierName || "Usuario"}</p>
      </div>
      
      {/* Detalle de productos */}
      <div className="border-b border-dashed border-gray-400 py-1">
        <div className="flex justify-between font-bold">
          <div className="w-1/2">Item</div>
          <div className="w-1/6 text-right">Price</div>
          <div className="w-1/6 text-right">Quantity</div>
          <div className="w-1/6 text-right">Total</div>
        </div>
        
        {saleData?.items.map((item: any, index: number) => (
          <div key={index} className="flex justify-between text-[9px]">
            <div className="w-1/2 truncate">{item.product.name}</div>
            <div className="w-1/6 text-right">{item.price.toFixed(2)}</div>
            <div className="w-1/6 text-right">{item.quantity}</div>
            <div className="w-1/6 text-right">{(item.price * item.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>
      
      {/* Totales */}
      <div className="py-1">
        <div className="flex justify-between">
          <div>Sub-Total</div>
          <div>{saleData?.total.toFixed(2)}</div>
        </div>
        <div className="flex justify-between">
          <div>VAT</div>
          <div>0.00</div>
        </div>
        {saleData?.discount > 0 && (
          <div className="flex justify-between">
            <div>Discount</div>
            <div>-{saleData.discount.toFixed(2)}</div>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <div>Total</div>
          <div>{saleData?.total.toFixed(2)}</div>
        </div>
      </div>
      
      {/* Información de pago */}
      <div className="border-t border-dashed border-gray-400 py-1">
        <div className="flex justify-between">
          <div>Payment Method</div>
          <div>{paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'PromptPay'}</div>
        </div>
        {paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between">
              <div>Cash Received</div>
              <div>{parseFloat(cashReceived).toFixed(2)}</div>
            </div>
            <div className="flex justify-between">
              <div>Change</div>
              <div>{change.toFixed(2)}</div>
            </div>
          </>
        )}
      </div>
      
      {/* Pie de ticket */}
      <div className="text-center border-t border-dashed border-gray-400 pt-2 mt-1">
        <p>EXCHANGE ARE ALLOWED WITHIN</p>
        <p>1 DAY WITH RECEIPT</p>
        <p>STRICTLY NO CASH REFUND</p>
        <p>VAT INCLUDED</p>
        <p className="font-bold mt-1">THANK YOU</p>
      </div>
    </div>
  );
});

TicketTemplate.displayName = 'TicketTemplate';

export default function ShopPage() {
  // Estado para productos y categorías
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Estado para búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Estado para el carrito de compra
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  // Nuevo estado para gestionar carga optimista y notificaciones
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [notificationState, setNotificationState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    visible: false,
    type: 'success',
    message: ''
  });
  
  // Estado para vista previa de ticket
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  
  // Ref para el ticket y función de impresión
  const ticketRef = useRef<HTMLDivElement>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  
  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: 'PosWeed-Ticket',
    onAfterPrint: () => {
      toast.success('Ticket impreso con éxito');
    },
    onPrintError: () => {
      toast.error('Error al imprimir. Intente de nuevo.');
      setShowTicketPreview(true);
    }
  });
  
  // Cargar productos y categorías al montar el componente
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);
  
  // Función mejorada para cargar productos
  const fetchProducts = async () => {
    setIsLoading(true);
    console.log("[Shop] Obteniendo productos...");
    
    try {
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        console.error(`[Shop] Error en la respuesta: ${response.status}`);
        setProducts([]);
        setIsLoading(false);
        return;
      }
      
      const text = await response.text();
      console.log(`[Shop] Respuesta: ${text.substring(0, 100)}...`);
      
      // Manejo de respuestas vacías
      if (!text || text === '{}' || text === '') {
        console.log("[Shop] Respuesta vacía, estableciendo productos como array vacío");
        setProducts([]);
        setIsLoading(false);
        return;
      }
      
      try {
        const data = JSON.parse(text);
        console.log("[Shop] Datos parseados:", data);
        
        // Verificar estructura de la respuesta
        if (data?.success === true && Array.isArray(data.products)) {
          // Formato correcto
          console.log(`[Shop] Productos obtenidos: ${data.products.length}`);
          setProducts(data.products);
        } else if (data?.success === true && data.products === null) {
          // Productos es null
          console.log("[Shop] products es null, estableciendo como array vacío");
          setProducts([]);
        } else if (Array.isArray(data)) {
          // Es un array directamente
          console.log(`[Shop] Array directo obtenido: ${data.length}`);
          setProducts(data);
        } else if (data?.products && Array.isArray(data.products)) {
          // Tiene la propiedad products y es un array
          console.log(`[Shop] Formato alternativo, productos: ${data.products.length}`);
          setProducts(data.products);
        } else {
          // No es un formato reconocido
          console.warn("[Shop] Los datos no tienen el formato esperado:", data);
          setProducts([]);
        }
      } catch (parseError) {
        console.error("[Shop] Error al parsear la respuesta:", parseError);
        setProducts([]);
      }
    } catch (error) {
      console.error("[Shop] Error al obtener productos:", error);
      setProducts([]);
    }
    
    setIsLoading(false);
  };
  
  // Función mejorada para cargar categorías
  const fetchCategories = async () => {
    try {
      console.log("[Shop] Iniciando carga de categorías...");
      
      const response = await fetch("/api/categories", {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        console.error(`[Shop] Error al cargar categorías: ${response.status}`);
        setCategories([]);
        return;
      }
      
      // Obtener el texto completo para debug
      const responseText = await response.text();
      console.log(`[Shop] Respuesta de API categorías (primeros 200 caracteres): ${responseText.substring(0, 200)}`);
      
      let data;
      try {
        // Parsear el texto a JSON
        data = JSON.parse(responseText);
        console.log(`[Shop] Datos de categorías parseados:`, data);
      } catch (error) {
        console.error("[Shop] Error al parsear respuesta JSON de categorías:", error);
        setCategories([]);
        return;
      }
      
      // Verificar la estructura de la respuesta
      if (!data || typeof data !== 'object') {
        console.error("[Shop] Formato de respuesta inválido:", data);
        setCategories([]);
        return;
      }
      
      // Extraer el array de categorías desde la propiedad categories
      const categoriesData = data.categories;
      
      // Asegurarnos de que categoriesData sea un array
      if (!Array.isArray(categoriesData)) {
        console.error("[Shop] Los datos de categorías no son un array:", categoriesData);
        setCategories([]);
        return;
      }
      
      // Validar que cada categoría tenga la estructura correcta
      const validCategories = categoriesData.filter((cat: any) => 
        cat && typeof cat === 'object' && 'id' in cat && 'name' in cat
      );
      
      if (validCategories.length !== categoriesData.length) {
        console.warn(`[Shop] Se filtraron ${categoriesData.length - validCategories.length} categorías con formato inválido`);
      }
      
      setCategories(validCategories);
      console.log(`[Shop] ${validCategories.length} categorías cargadas y guardadas en estado`);
    } catch (error) {
      console.error("[Shop] Error al cargar categorías:", error);
      setCategories([]);
    }
  };
  
  // Filtrar productos por búsqueda y categoría
  const filteredProducts = products.filter(product => {
    // Asegurarse de que los valores sean strings antes de usar toLowerCase
    const productName = typeof product.name === 'string' ? product.name.toLowerCase() : '';
    const productSku = typeof product.sku === 'string' ? product.sku.toLowerCase() : '';
    const searchQueryLower = searchQuery.toLowerCase();
    
    // Verificar si el producto coincide con la búsqueda
    const matchesSearch = searchQuery === '' || 
      productName.includes(searchQueryLower) ||
      productSku.includes(searchQueryLower);
    
    // Verificar si el producto coincide con la categoría seleccionada
    const matchesCategory = 
      selectedCategory === "all" || 
      product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Funciones para el carrito
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      // Verificar si el producto ya está en el carrito
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Aumentar la cantidad
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        // Añadir nuevo item
        return [...prevCart, { product, quantity: 1 }];
      }
    });
    
    toast.success(`${product.name} añadido al carrito`);
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };
  
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };
  
  const clearCart = () => {
    setCart([]);
  };
  
  // Calcular total del carrito
  const cartTotal = cart.reduce(
    (total, item) => total + (item.product.price * item.quantity), 
    0
  );
  
  // Completar venta
  const handlePayment = () => {
    setShowConfirmModal(true);
  };
  
  const confirmPayment = async () => {
    try {
      // Mostrar estado de procesamiento
      setIsProcessingSale(true);
      
      // Optimismo UI: mostrar notificación de éxito inmediatamente
      setNotificationState({
        visible: true,
        type: 'success',
        message: 'Procesando venta...'
      });
      
      // Crear objeto de venta
      const saleData = {
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          product: item.product
        })),
        total: cartTotal,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change: paymentMethod === 'cash' ? change : null,
        date: new Date().toISOString(),
        invoiceNumber: `${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getTime().toString().slice(-6)}`
      };
      
      // Guardar datos del ticket para impresión
      setTicketData({
        saleData,
        storeInfo: {
          name: "PosWeed Shop",
          address: "Bangkok 10260",
          phone: "0629200045",
          email: "",
          taxId: "0105567194501"
        },
        cashReceived,
        change,
        paymentMethod
      });
      
      // Guardar una copia del carrito para el manejo optimista
      const previousCart = [...cart];
      
      // Limpiar carrito y modal inmediatamente para dar sensación de rapidez
      setCart([]);
      setShowConfirmModal(false);
      setCashReceived("");
      setChange(0);
      
      // Mostrar toast de "procesando"
      const loadingToast = toast.loading('Procesando venta...');
      
      // Enviar datos al servidor
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
      });
      
      // Eliminar el toast de carga
      toast.dismiss(loadingToast);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar la venta');
      }
      
      // Actualizar notificación de éxito
      setNotificationState({
        visible: true,
        type: 'success',
        message: 'Venta completada con éxito'
      });
      
      // Mostrar mensaje de éxito persistente
      toast.success('¡Venta completada con éxito!', {
        duration: 5000,
        icon: '🎉'
      });
      
      // Imprimir ticket automáticamente
      setTimeout(() => {
        handlePrint();
      }, 500);
      
      // Ocultar notificación después de 5 segundos
      setTimeout(() => {
        setNotificationState(prev => ({...prev, visible: false}));
      }, 5000);
      
    } catch (error) {
      console.error('Error al procesar venta:', error);
      
      // Actualizar notificación de error
      setNotificationState({
        visible: true,
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al procesar la venta'
      });
      
      // Mostrar mensaje de error
      toast.error('Error al procesar la venta', {
        duration: 5000
      });
      
      // Ocultar notificación después de 5 segundos
      setTimeout(() => {
        setNotificationState(prev => ({...prev, visible: false}));
      }, 5000);
    } finally {
      setIsProcessingSale(false);
    }
  };
  
  // Manejar cambio en efectivo recibido
  const handleCashReceivedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCashReceived(value);
    
    // Calcular el cambio si es un número válido
    if (value && !isNaN(parseFloat(value))) {
      const cashAmount = parseFloat(value);
      const changeAmount = cashAmount - cartTotal;
      setChange(changeAmount > 0 ? changeAmount : 0);
    } else {
      setChange(0);
    }
  };
  
  // Función para mostrar la vista previa del ticket
  const showTicketModal = () => {
    setShowTicketPreview(true);
  };
  
  return (
    <div className="flex h-screen relative">
      {/* Componente Toaster para notificaciones toast */}
      <Toaster position="top-right" />
      
      {/* Notificación toast personalizada */}
      {notificationState.visible && (
        <div 
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            notificationState.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${
            notificationState.type === 'success' ? 'bg-green-600 text-white' :
            'bg-red-600 text-white'
          }`}
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center">
            {notificationState.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {notificationState.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{notificationState.message}</span>
          </div>
        </div>
      )}
      
      {/* Sección principal - Productos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Buscador y filtros */}
        <div className="flex flex-wrap gap-4 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Buscar productos..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-12 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Productos */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">
              {error}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No se encontraron productos</h3>
              <p className="mt-2 text-gray-500">
                {searchQuery || selectedCategory !== "all"
                  ? "Intenta con otros términos de búsqueda o categoría"
                  : "Añade productos en la sección de gestión de productos"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => addToCart(product)}
                >
                  <div className="w-full h-40 bg-gray-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-lg">Sin imagen</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="text-green-600 font-bold mt-1">${typeof product.price === 'number' ? product.price.toFixed(2) : '0.00'}</p>
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        product.categoryObj?.color 
                          ? getColorClass(product.categoryObj.color)
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {product.categoryObj?.name || (typeof product.category === 'string' ? product.category : 'Sin categoría')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Carrito de compras */}
      <div className="w-80 lg:w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <h2 className="text-lg font-bold flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Venta Actual
          </h2>
        </div>
        
        {/* Productos en carrito - versión compacta */}
        <div className="flex-1 overflow-y-auto p-2 max-h-[500px]">
          {cart.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No hay productos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center bg-gray-50 p-1.5 rounded-lg relative text-sm">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  
                  {item.product.imageUrl ? (
                    <div className="w-10 h-10 bg-white rounded overflow-hidden mr-2">
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded mr-2 flex items-center justify-center">
                      <span className="text-xl text-gray-400">
                        {item.product.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="font-medium text-gray-900 truncate">{item.product.name}</h4>
                    <p className="text-green-600 text-xs">${item.product.price.toFixed(2)}</p>
                  </div>
                  
                  <div className="flex items-center border border-gray-300 rounded ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product.id, item.quantity - 1);
                      }}
                      className="px-1 py-0.5 text-gray-600 hover:bg-gray-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    
                    <span className="w-6 text-center text-xs">{item.quantity}</span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity(item.product.id, item.quantity + 1);
                      }}
                      className="px-1 py-0.5 text-gray-600 hover:bg-gray-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Resumen y acciones */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-lg">Total</span>
            <span className="font-bold text-xl">${cartTotal.toFixed(2)}</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => clearCart()}
              disabled={cart.length === 0 || isProcessingSale}
              className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar
            </button>
            
            <button
              onClick={handlePayment}
              disabled={cart.length === 0 || isProcessingSale}
              className="flex-1 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessingSale ? (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  <span>Procesando...</span>
                </div>
              ) : (
                <span>Pagar ${cartTotal.toFixed(2)}</span>
              )}
            </button>
          </div>
          
          {ticketData && (
            <div className="flex space-x-2 mt-2">
              <button
                onClick={handlePrint}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 flex items-center justify-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </button>
              <button
                onClick={showTicketModal}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de confirmación de pago */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in duration-300 relative">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Confirmar Venta</h3>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Por favor revisa los artículos antes de confirmar la venta
              </p>
              
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.product.name}</span>
                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Métodos de pago */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                      paymentMethod === 'cash' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Wallet className={`h-6 w-6 mb-1 ${paymentMethod === 'cash' ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className={`text-sm ${paymentMethod === 'cash' ? 'font-medium text-green-700' : 'text-gray-700'}`}>Cash</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                      paymentMethod === 'card' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className={`h-6 w-6 mb-1 ${paymentMethod === 'card' ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className={`text-sm ${paymentMethod === 'card' ? 'font-medium text-green-700' : 'text-gray-700'}`}>Card</span>
                  </button>
                  
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('promptpay')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                      paymentMethod === 'promptpay' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Smartphone className={`h-6 w-6 mb-1 ${paymentMethod === 'promptpay' ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className={`text-sm ${paymentMethod === 'promptpay' ? 'font-medium text-green-700' : 'text-gray-700'}`}>PromptPay</span>
                  </button>
                </div>
              </div>
              
              {/* Campo de efectivo recibido (solo si el método es efectivo) */}
              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={cashReceived}
                    onChange={handleCashReceivedChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Enter amount"
                  />
                  
                  {parseFloat(cashReceived) > 0 && (
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                      <div className="flex justify-between font-medium">
                        <span>Change:</span>
                        <span className={change >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                          ${change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessingSale}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPayment}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={(paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < cartTotal)) || cart.length === 0 || isProcessingSale}
              >
                {isProcessingSale ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>Confirmar Pago</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de vista previa del ticket */}
      {showTicketPreview && ticketData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in duration-300 relative flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Vista Previa del Ticket</h3>
              <button 
                onClick={() => setShowTicketPreview(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex justify-center">
              <div className="border border-gray-300 shadow-sm">
                {/* Aquí está el contenido clonado del ticket para vista previa */}
                <TicketTemplate 
                  ref={null}
                  saleData={ticketData.saleData}
                  storeInfo={ticketData.storeInfo}
                  cashReceived={ticketData.cashReceived}
                  change={ticketData.change}
                  paymentMethod={ticketData.paymentMethod}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setShowTicketPreview(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Componente oculto para impresión */}
      <div className="hidden">
        {ticketData && (
          <TicketTemplate 
            ref={ticketRef} 
            saleData={ticketData.saleData}
            storeInfo={ticketData.storeInfo}
            cashReceived={ticketData.cashReceived}
            change={ticketData.change}
            paymentMethod={ticketData.paymentMethod}
          />
        )}
      </div>
    </div>
  );
} 