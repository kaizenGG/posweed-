"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher, defaultOptions, stableDataOptions, processApiResponse } from "@/lib/swr";
import { Package, Plus, Search, Edit, Trash, ArrowUpCircle, FileText, SlidersHorizontal, History, RefreshCw, BarChart, PlusCircle } from "lucide-react";
import React from 'react';

interface Room {
  id: string;
  name: string;
  forSale?: boolean;
  description?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  category?: string;
  imageUrl?: string;
  stock: number;
  avgCost?: number;
  categoryObj?: {
    id: string;
    name: string;
    color?: string;
  };
  categoryId?: string;
  storeId?: string;
}

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
}

interface RestockData {
  productId: string;
  quantity: string;
  roomId: string;
  cost: string;
  supplierId: string | null;
  invoiceNumber: string | null;
}

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  cost: number;
  createdAt: string;
  product: Product;
  room: Room;
  supplier?: Supplier;
  invoiceNumber?: string;
  notes?: string;
}

// Agregar interfaz para los datos agrupados por producto
interface GroupedInventoryItem {
  product: Product;
  totalQuantity: number;
  totalCost: number;
  totalValue: number;
  avgCost: number;
  rooms: {
    room: Room;
    quantity: number;
    avgCost: number;
  }[];
}

// Add the colorMap function near the top of the file with other utility functions
const getBgClass = (color: string | undefined) => {
  if (!color) return 'bg-gray-200 text-gray-800';
  
  const colorMap: Record<string, string> = {
    'green': 'bg-green-200 text-green-800',
    'lime': 'bg-lime-200 text-lime-800',
    'emerald': 'bg-emerald-200 text-emerald-800',
    'orange': 'bg-orange-200 text-orange-800',
    'teal': 'bg-teal-200 text-teal-800',
    'sky': 'bg-sky-200 text-sky-800',
    'purple': 'bg-purple-200 text-purple-800',
    'yellow': 'bg-yellow-200 text-yellow-800',
    'amber': 'bg-amber-200 text-amber-800',
    'indigo': 'bg-indigo-200 text-indigo-800',
    'gray': 'bg-gray-200 text-gray-800',
    'pink': 'bg-pink-200 text-pink-800',
    'red': 'bg-red-200 text-red-800',
    'rose': 'bg-rose-200 text-rose-800',
    'blue': 'bg-blue-200 text-blue-800',
  };
  
  return colorMap[color] || 'bg-gray-200 text-gray-800';
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);
  const [isSubmittingEditRoom, setIsSubmittingEditRoom] = useState(false);
  const [isSubmittingDeleteRoom, setIsSubmittingDeleteRoom] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [restockData, setRestockData] = useState<RestockData>({
    productId: '',
    quantity: '',
    roomId: '',
    cost: '',
    supplierId: null,
    invoiceNumber: null,
  });
  const [roomData, setRoomData] = useState({
    name: '',
    forSale: false,
    description: '',
  });
  const [editRoomData, setEditRoomData] = useState({
    id: '',
    name: '',
    forSale: false,
    description: '',
  });
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryWithStats, setInventoryWithStats] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [showDeleteStockModal, setShowDeleteStockModal] = useState(false);
  const [showTransferStockModal, setShowTransferStockModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    productId: string;
    roomId: string;
    productName: string;
    roomName: string;
    quantity: number;
    avgCost: number;
  } | null>(null);
  const [editStockData, setEditStockData] = useState({
    quantity: '',
  });
  const [transferStockData, setTransferStockData] = useState({
    quantity: '',
    destinationRoomId: '',
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  } | null>(null);

  // Añadir nuevos estados para los filtros
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  // Referencia para los menús desplegables
  const filtersRef = useRef<HTMLDivElement>(null);
  const dropdownMenusRef = useRef<HTMLDivElement>(null);

  // Usar SWR para obtener las salas
  const { data: roomsData, error: roomsError, mutate: mutateRooms } = useSWR('/api/rooms', fetcher, {
    ...defaultOptions,
    onSuccess: (data) => {
      console.log("SWR: Rooms loaded successfully");
      const processedRooms = processApiResponse<Room>(data, 'rooms');
      setRooms(processedRooms);
    },
    onError: (err) => {
      console.error("SWR: Error loading rooms:", err);
      setRooms([]);
    }
  });
  
  // Usar SWR para obtener los productos
  const { data: productsData, error: productsError, mutate: mutateProducts } = useSWR('/api/products', fetcher, {
    ...defaultOptions,
    onSuccess: (data) => {
      console.log("SWR: Products loaded successfully");
      const processedProducts = processApiResponse<Product>(data, 'products');
      setProducts(processedProducts);
    },
    onError: (err) => {
      console.error("SWR: Error loading products:", err);
      setProducts([]);
    }
  });
  
  // Usar SWR para obtener los proveedores (cambian con menos frecuencia)
  const { data: suppliersData, error: suppliersError, mutate: mutateSuppliers } = useSWR('/api/suppliers', fetcher, {
    ...stableDataOptions,
    onSuccess: (data) => {
      console.log("SWR: Suppliers loaded successfully");
      const processedSuppliers = processApiResponse<Supplier>(data, 'suppliers');
      setSuppliers(processedSuppliers);
    },
    onError: (err) => {
      console.error("SWR: Error loading suppliers:", err);
      setSuppliers([]);
    }
  });
  
  // Usar SWR para obtener las categorías (cambian con menos frecuencia)
  const { data: categoriesData, error: categoriesError, mutate: mutateCategories } = useSWR('/api/categories', fetcher, {
    ...stableDataOptions,
    onSuccess: (data) => {
      console.log("SWR: Categories loaded successfully");
      const processedCategories = processApiResponse<{id: string, name: string, color: string}>(data, 'categories');
      setCategories(processedCategories);
      setIsLoadingCategories(false);
    },
    onError: (err) => {
      console.error("SWR: Error loading categories:", err);
      setCategories([]);
      setIsLoadingCategories(false);
    }
  });
  
  // Usar SWR para obtener los datos del inventario
  const { data: inventoryStatsData, error: inventoryStatsError, mutate: mutateInventoryStats } = useSWR('/api/inventory/stats', fetcher, {
    ...defaultOptions,
    onSuccess: (data) => {
      console.log("SWR: Inventory stats loaded successfully");
      let inventoryItems = processApiResponse<any>(data, 'inventory');
      
      // Filtrar elementos inválidos
      const validInventory = inventoryItems.filter(item => 
        item && item.product && item.room && typeof item.quantity === 'number'
      );
      
      if (validInventory.length === 0 && products.length > 0 && rooms.length > 0) {
        console.log("SWR: No valid inventory items found, creating fallback");
        createFallbackInventory(products, rooms);
      } else {
        setInventoryWithStats(validInventory);
      }
      
      setIsLoadingInventory(false);
    },
    onError: (err) => {
      console.error("SWR: Error loading inventory stats:", err);
      if (products.length > 0 && rooms.length > 0) {
        createFallbackInventory(products, rooms);
      }
      setIsLoadingInventory(false);
    }
  });
  
  // Cargar transacciones solo cuando se esté en la pestaña de transacciones
  const shouldFetchTransactions = activeTab === 'transactions';
  const { data: transactionsData, error: transactionsError, mutate: mutateTransactions } = useSWR(
    shouldFetchTransactions ? '/api/inventory/transactions' : null,
    fetcher,
    {
      ...defaultOptions,
      onSuccess: (data) => {
        console.log("SWR: Transactions loaded successfully");
        const processedTransactions = processApiResponse<InventoryTransaction>(data, 'transactions');
        setTransactions(processedTransactions);
        setIsLoadingTransactions(false);
      },
      onError: (err) => {
        console.error("SWR: Error loading transactions:", err);
        setTransactions([]);
        setIsLoadingTransactions(false);
      }
    }
  );
  
  // Modificar las funciones de carga para usar mutate en lugar de fetch
  
  // Actualizar fetchProducts para usar mutate
  const fetchProducts = async () => {
    try {
      console.log("Refreshing products data...");
      await mutateProducts();
      return products;
    } catch (error) {
      console.error("Error refreshing products:", error);
      return [];
    }
  };
  
  // Actualizar fetchRooms para usar mutate
  const fetchRooms = async () => {
    try {
      console.log("Refreshing rooms data...");
      await mutateRooms();
      return rooms;
    } catch (error) {
      console.error("Error refreshing rooms:", error);
      return [];
    }
  };
  
  // Actualizar fetchCategories para usar mutate
  const fetchCategories = async (): Promise<{id: string, name: string, color: string}[]> => {
    try {
      console.log("Refreshing categories data...");
      setIsLoadingCategories(true);
      await mutateCategories();
      return categories;
    } catch (error) {
      console.error("Error refreshing categories:", error);
      return [];
    } finally {
      setIsLoadingCategories(false);
    }
  };
  
  // Actualizar fetchSuppliers para usar mutate
  const fetchSuppliers = async () => {
    try {
      console.log("Refreshing suppliers data...");
      await mutateSuppliers();
    } catch (error) {
      console.error("Error refreshing suppliers:", error);
    }
  };
  
  // Actualizar fetchInventoryWithStats para usar mutate
  const fetchInventoryWithStats = async () => {
    try {
      console.log("Refreshing inventory stats...");
      setIsLoadingInventory(true);
      await mutateInventoryStats();
    } catch (error) {
      console.error("Error refreshing inventory stats:", error);
      if (products.length > 0 && rooms.length > 0) {
        createFallbackInventory(products, rooms);
      }
    } finally {
      setIsLoadingInventory(false);
    }
  };
  
  // Actualizar fetchTransactions para usar mutate
  const fetchTransactions = async () => {
    try {
      console.log("Refreshing transactions data...");
      setIsLoadingTransactions(true);
      await mutateTransactions();
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };
  
  // Modificar la función syncInventory para usar mutate
  const syncInventory = async () => {
    try {
      setIsLoadingInventory(true);
      console.log("Synchronizing all inventory data...");
      
      // Refrescar todos los datos en paralelo
      await Promise.all([
        mutateProducts(),
        mutateRooms(),
        mutateCategories(),
        mutateSuppliers()
      ]);
      
      // Después actualizar el inventario
      await mutateInventoryStats();
      
      // Si estamos en la pestaña de transacciones, actualizar también
      if (activeTab === 'transactions') {
        await mutateTransactions();
      }
      
      console.log("Inventory data synchronized successfully");
      showNotification("Datos sincronizados correctamente", 'success');
    } catch (error) {
      console.error("Error synchronizing inventory data:", error);
      showNotification("Error al sincronizar los datos del inventario", 'error');
    } finally {
      setIsLoadingInventory(false);
    }
  };
  
  // Modificar el useEffect para que no cargue los datos al montar, ya que SWR se encarga
  useEffect(() => {
    // Detectar cambios en la pestaña activa
    if (activeTab === 'transactions' && !transactionsData && !isLoadingTransactions) {
      console.log("Active tab changed to transactions, loading transaction data");
      setIsLoadingTransactions(true);
      mutateTransactions();
    }
    
    // Cerrar menús al hacer clic fuera de ellos (mantener esta parte)
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar filtros si está abierto y se hace clic fuera
      if (showFilters && filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
      
      // Cerrar menú de acciones si está abierto y se hace clic fuera
      if (openMenu && event.target instanceof Node) {
        // Verificar si el clic fue dentro de algún menú desplegable de acciones
        const clickedInsideDropdown = document.querySelector(`[data-menu-id="${openMenu}"]`)?.contains(event.target as Node);
        
        if (!clickedInsideDropdown) {
          setOpenMenu(null);
        }
      }
    };

    // Agregar el event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpiar el event listener al desmontar
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTab, transactionsData, isLoadingTransactions, showFilters, openMenu]);
  
  // Estilos para los modales
  const styles = {
    modalOverlay: "fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center overflow-y-auto p-4",
    modalContent: "bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in duration-300 relative",
    modalHeader: "px-6 py-4 border-b border-gray-200 flex justify-between items-center",
    modalBody: "p-6",
    modalFooter: "flex border-t border-gray-200",
    primaryButton: "w-full py-3 text-center text-white bg-green-600 font-medium hover:bg-green-700 transition-colors rounded-br-lg",
    secondaryButton: "w-full py-3 text-center text-gray-700 border-r border-gray-200 font-medium transition-colors hover:bg-gray-50 rounded-bl-lg",
    dangerButton: "w-full py-3 text-center text-white bg-red-600 rounded-md font-medium hover:bg-red-700 transition-colors",
    closeButton: "text-gray-400 hover:text-gray-600 focus:outline-none",
    tab: "px-4 py-2 text-center transition-colors cursor-pointer",
    activeTab: "border-b-2 border-green-500 text-green-600 font-medium",
    inactiveTab: "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
  };

  // Manejadores de eventos para formularios
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      console.log("[Restock] Iniciando proceso de restock...");
      console.log("[Restock] Datos:", JSON.stringify(restockData, null, 2));
      
      // Validar datos
      if (!restockData.productId || !restockData.quantity || !restockData.roomId) {
        const missingFields = [];
        if (!restockData.productId) missingFields.push("productId");
        if (!restockData.quantity) missingFields.push("quantity");
        if (!restockData.roomId) missingFields.push("roomId");
        
        const errorMsg = `Faltan campos requeridos: ${missingFields.join(', ')}`;
        console.error("[Restock] Error de validación:", errorMsg);
        showNotification(errorMsg, 'error');
        return false;
      }
      
      // Validar formato numérico
      const numQuantity = parseFloat(restockData.quantity);
      if (isNaN(numQuantity) || numQuantity <= 0) {
        const errorMsg = "La cantidad debe ser un número positivo";
        console.error("[Restock] Error de validación:", errorMsg);
        showNotification(errorMsg, 'error');
        return false;
      }
      
      // Construir los datos para la API
      const costValue = restockData.cost ? parseFloat(restockData.cost) : 0;
      const requestData = {
        productId: restockData.productId,
        quantity: numQuantity,
        roomId: restockData.roomId,
        cost: isNaN(costValue) ? 0 : costValue,
        supplierId: restockData.supplierId || null,
        invoiceNumber: restockData.invoiceNumber || null
      };
      
      console.log("[Restock] Enviando solicitud a API con datos:", JSON.stringify(requestData, null, 2));
      
      // Realizar la solicitud a la API
      const response = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const responseData = await response.json();
      console.log(`[Restock] Respuesta API (${response.status}):`, JSON.stringify(responseData, null, 2));
      
      if (!response.ok) {
        throw new Error(responseData.error || `Error en la respuesta: ${response.status}`);
      }
      
      // Cerrar modal y reiniciar formulario si fue exitoso
      if (responseData.success) {
        console.log("[Restock] Restock exitoso. Cerrando modal y actualizando datos.");
      setShowRestockModal(false);
      setRestockData({
          productId: "",
          quantity: "",
          roomId: "",
          cost: "",
        supplierId: null,
          invoiceNumber: null
        });
        
        // Mostrar notificación de éxito
        showNotification('Producto reabastecido exitosamente', 'success');
        
        // Actualizar datos
        await fetchInventoryWithStats();
        
        // Si estamos en la pestaña de transacciones, actualizar también
        if (activeTab === 'transactions') {
          await fetchTransactions();
        }
        
        return true;
      } else {
        throw new Error(responseData.error || 'Error desconocido en el restock');
      }
    } catch (error: any) {
      console.error("[Restock] Error durante restock:", error);
      showNotification(error.message || "Error al reabastecer producto", 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmittingRoom(true);
      console.log("Sending new room data:", roomData);
      
      // Add log entry
      const logEntry = {
        type: "ROOM_CREATED",
        roomName: roomData.name,
        forSale: roomData.forSale,
        timestamp: new Date().toISOString(),
      };
      
      console.log("Creating room log entry:", logEntry);
      
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomData,
          logEntry,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating room: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Room created:", data);
      
      // Close modal and reset form
      setShowAddRoomModal(false);
      setRoomData({
        name: '',
        forSale: false,
        description: '',
      });
      
      // Update room list
      await mutateRooms();
      
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsSubmittingRoom(false);
    }
  };
  
  const handleEditRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmittingEditRoom(true);
      console.log("Sending room edit data:", editRoomData);
      
      // Add log entry
      const logEntry = {
        type: "ROOM_UPDATED",
        roomId: editRoomData.id,
        roomName: editRoomData.name,
        forSale: editRoomData.forSale,
        timestamp: new Date().toISOString(),
      };
      
      console.log("Creating room update log entry:", logEntry);
      
      const response = await fetch(`/api/rooms/${editRoomData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editRoomData.name,
          forSale: editRoomData.forSale,
          description: editRoomData.description,
          logEntry,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating room: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Room updated:", data);
      
      // Close modal and reset form
      setShowEditRoomModal(false);
      
      // Update room list
      fetchRooms();
      
    } catch (error) {
      console.error("Error editing room:", error);
    } finally {
      setIsSubmittingEditRoom(false);
    }
  };
  
  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    try {
      setIsSubmittingDeleteRoom(true);
      console.log("Deleting room:", roomToDelete);
      
      // Add log entry
      const logEntry = {
        type: "ROOM_DELETED",
        roomId: roomToDelete,
        timestamp: new Date().toISOString(),
      };
      
      console.log("Creating room deletion log entry:", logEntry);
      
      const response = await fetch(`/api/rooms/${roomToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logEntry }),
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting room: ${response.status}`);
      }
      
      // Close modal and reset state
      setShowDeleteRoomModal(false);
      setRoomToDelete(null);
      
      // Update room list and inventory stats
      fetchRooms();
      fetchInventoryWithStats();
      
    } catch (error) {
      console.error("Error deleting room:", error);
    } finally {
      setIsSubmittingDeleteRoom(false);
    }
  };

  // Manejador para restock que sincroniza el inventario después
  const handleRestockSubmitWithSync = async (e: React.FormEvent) => {
    try {
      e.preventDefault(); // Prevenir comportamiento por defecto del formulario
      console.log("Iniciando proceso de restock con sincronización...");
      
      // Llamar al método original de restock
      const success = await handleRestockSubmit(e);
      
      if (success) {
        // Después de que el restock sea exitoso, sincronizar el inventario
        console.log("Restock exitoso, sincronizando inventario...");
        try {
          await syncInventory();
          console.log("Inventario sincronizado correctamente después del restock");
        } catch (syncError) {
          console.error("Error al sincronizar inventario después del restock:", syncError);
          // No bloqueamos el flujo si falla la sincronización, solo notificamos
          showNotification("El restock se completó, pero hubo un error al actualizar los datos en pantalla. Por favor, recargue la página.", 'error');
        }
      } else {
        console.log("No se realizará sincronización porque el restock no fue exitoso");
      }
    } catch (error) {
      console.error("Error durante el proceso de restock con sincronización:", error);
      showNotification("Se produjo un error durante el restock. Por favor, intente nuevamente.", 'error');
    }
  };

  // Manejador para editar stock
  const handleEditStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!selectedStock) return;
      
      setIsSubmitting(true);
      console.log("Editando stock:", {
        productId: selectedStock.productId,
        roomId: selectedStock.roomId,
        quantity: editStockData.quantity,
      });
      
      // Modificar para usar el endpoint existente de inventario
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedStock.productId,
          roomId: selectedStock.roomId,
          quantity: parseFloat(editStockData.quantity),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al editar stock: ${response.status}`);
      }
      
      // Cerrar el modal y actualizar el inventario
      setShowEditStockModal(false);
      fetchInventoryWithStats();
      showNotification('Stock actualizado correctamente', 'success');
      
    } catch (error: any) {
      console.error("Error al editar stock:", error);
      showNotification(error.message || "Error al editar stock", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejador para eliminar stock
  const handleDeleteStock = async () => {
    try {
      if (!selectedStock) return;
      
      setIsSubmitting(true);
      console.log("Actualizando stock a 0:", {
        productId: selectedStock.productId,
        roomId: selectedStock.roomId,
      });
      
      // En lugar de intentar eliminar, actualizamos la cantidad a 0
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedStock.productId,
          roomId: selectedStock.roomId,
          quantity: "0" // Establecer la cantidad a 0 en vez de eliminar
        }),
      });
      
      // Log de la respuesta completa para depuración
      const responseData = await response.json();
      console.log(`Respuesta del servidor (${response.status}):`, responseData);
      
      if (!response.ok) {
        throw new Error(`Error al eliminar stock: ${response.status}`);
      }
      
      // Cerrar el modal y actualizar el inventario
      setShowDeleteStockModal(false);
      await fetchInventoryWithStats(); // Esperar a que se complete la actualización
      showNotification('Stock eliminado correctamente', 'success');
      
    } catch (error: any) {
      console.error("Error al eliminar stock:", error);
      showNotification(error.message || "Error al eliminar stock", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejador para trasladar stock
  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!selectedStock) return;
      
      setIsSubmitting(true);
      console.log("Trasladando stock:", {
        productId: selectedStock.productId,
        sourceRoomId: selectedStock.roomId,
        destinationRoomId: transferStockData.destinationRoomId,
        quantity: transferStockData.quantity,
      });
      
      // Validar que la cantidad a trasladar no sea mayor que la disponible
      if (parseFloat(transferStockData.quantity) > selectedStock.quantity) {
        throw new Error("La cantidad a trasladar no puede ser mayor que la disponible");
      }
      
      // Validar que se haya seleccionado una sala de destino
      if (!transferStockData.destinationRoomId) {
        throw new Error("Debe seleccionar una sala de destino");
      }
      
      // Validar que la sala de destino sea diferente a la de origen
      if (transferStockData.destinationRoomId === selectedStock.roomId) {
        throw new Error("La sala de destino debe ser diferente a la de origen");
      }
      
      // Modificar para usar el endpoint existente de inventario para transferencias
      const response = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedStock.productId,
          sourceRoomId: selectedStock.roomId,
          destinationRoomId: transferStockData.destinationRoomId,
          quantity: parseFloat(transferStockData.quantity),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error al trasladar stock: ${response.status}`);
      }
      
      // Cerrar el modal y actualizar el inventario
      setShowTransferStockModal(false);
      fetchInventoryWithStats();
      showNotification('Stock trasladado correctamente', 'success');
      
    } catch (error: any) {
      console.error("Error al trasladar stock:", error);
      showNotification(error.message || "Error al trasladar stock", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
    
    // Ocultar la notificación después de 3 segundos
    setTimeout(() => {
      setNotification(prev => prev ? { ...prev, visible: false } : null);
      
      // Eliminar completamente después de la animación
      setTimeout(() => {
        setNotification(null);
      }, 500);
    }, 3000);
  };

  // Definir la variable groupedInventory antes de usarla en el rendering
  const groupedInventory: GroupedInventoryItem[] = React.useMemo(() => {
    return Object.values(
      inventoryWithStats
        .filter(item => {
          // Filtrar por término de búsqueda
          const matchesSearchTerm = item.product.name.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Filtrar por habitaciones seleccionadas
          const matchesRoom = selectedRoomIds.length === 0 || selectedRoomIds.includes(item.roomId);
          
          // Filtrar por categorías seleccionadas
          const matchesCategory = selectedCategoryIds.length === 0 || 
            (item.product.categoryId && selectedCategoryIds.includes(item.product.categoryId));
          
          return matchesSearchTerm && matchesRoom && matchesCategory;
        })
        .reduce<Record<string, GroupedInventoryItem>>((acc, item) => {
          const productId = item.product.id;
          if (!acc[productId]) {
            acc[productId] = {
              product: item.product,
              totalQuantity: 0,
              totalCost: 0,
              totalValue: 0,
              avgCost: 0,
              rooms: []
            };
          }
          
          // Acumular totales
          acc[productId].totalQuantity += item.quantity;
          const itemCost = item.avgCost * item.quantity;
          acc[productId].totalCost += itemCost;
          acc[productId].totalValue += item.product.price * item.quantity;
          
          // Guardar info de la habitación
          acc[productId].rooms.push({
            room: item.room,
            quantity: item.quantity,
            avgCost: item.avgCost
          });
          
          return acc;
        }, {})
    ).map((groupedItem: GroupedInventoryItem) => {
      // Calcular costo promedio general
      groupedItem.avgCost = groupedItem.totalQuantity > 0 
        ? groupedItem.totalCost / groupedItem.totalQuantity 
        : 0;
      
      return groupedItem;
    });
  }, [inventoryWithStats, searchTerm, selectedRoomIds, selectedCategoryIds]);

  // Ejemplo básico de interfaz para simular la página
  return (
    <div className="p-4 mx-auto max-w-7xl">
      {/* Header con título y botones de acción */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddRoomModal(true)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-medium rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Room
          </button>
          <button
            onClick={() => setShowRestockModal(true)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md flex items-center"
          >
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            Restock Product
          </button>
        </div>
      </div>

      {/* Sección de Rooms (Áreas de almacenamiento) */}
              <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-medium">Rooms</h2>
                  <button
                    onClick={() => setShowAddRoomModal(true)}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Room
                  </button>
                </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-3 flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{room.name}</h3>
                  {room.forSale && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                      For Sale <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                          <button 
                            onClick={() => {
                              setEditRoomData({
                                id: room.id,
                                name: room.name,
                                forSale: room.forSale || false,
                                description: room.description || '',
                              });
                              setShowEditRoomModal(true);
                            }}
                    className="text-gray-500 hover:text-gray-700"
                          >
                    <Edit className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => {
                              setRoomToDelete(room.id);
                              setShowDeleteRoomModal(true);
                            }}
                    className="text-gray-500 hover:text-red-600"
                          >
                    <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

      {/* Campo de búsqueda y filtros en línea */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div className="relative w-full sm:w-auto max-w-md">
                    <input
                      type="text"
            placeholder="Search stock by product name"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

        <div className="flex space-x-2">
          <div className="relative" ref={filtersRef}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-1.5 border ${showFilters ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'} rounded-md text-sm`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters {(selectedRoomIds.length > 0 || selectedCategoryIds.length > 0) && 
                <span className="ml-1 w-5 h-5 flex items-center justify-center bg-green-500 text-white text-xs rounded-full">
                  {selectedRoomIds.length + selectedCategoryIds.length}
                                      </span>
              }
            </button>
            
            {showFilters && (
              <div className="absolute mt-2 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  {/* Sección Rooms */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">Rooms</h3>
                      <button
                        onClick={() => setSelectedRoomIds([])}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                                  </div>
                    <div className="flex flex-wrap gap-1">
                      {rooms.map((room) => (
                                <button 
                          key={room.id}
                          className={`px-3 py-1 text-xs rounded-md ${
                            selectedRoomIds.includes(room.id)
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                                  onClick={() => {
                            setSelectedRoomIds(prev => 
                              prev.includes(room.id)
                                ? prev.filter(id => id !== room.id)
                                : [...prev, room.id]
                            );
                          }}
                        >
                          {room.name}
                                </button>
                      ))}
                    </div>
                  </div>

                  {/* Sección Categories */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-900">Categories</h3>
                            <button
                        onClick={() => setSelectedCategoryIds([])}
                        className="text-xs text-gray-500 hover:text-gray-700"
                            >
                        Clear
                            </button>
                </div>
                    <div className="flex flex-wrap gap-1">
                      {isLoadingCategories ? (
                        <div className="w-full text-center py-2">
                          <div className="inline-block animate-spin h-4 w-4 border-t-2 border-green-500 rounded-full"></div>
              </div>
                      ) : categories.length === 0 ? (
                        <div className="w-full text-center py-2 text-xs text-gray-500">
                          No categories found
            </div>
                      ) : (
                        categories.map((category) => (
                          <button
                            key={category.id}
                            className={`px-3 py-1 text-xs rounded-md ${
                              selectedCategoryIds.includes(category.id)
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : `bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200`
                            }`}
                            onClick={() => {
                              setSelectedCategoryIds(prev => 
                                prev.includes(category.id)
                                  ? prev.filter(id => id !== category.id)
                                  : [...prev, category.id]
                              );
                            }}
                          >
                            {category.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sección Low Stock */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Low Stock (&lt; 50)</h3>
                      <div className="relative inline-block w-10 align-middle select-none">
                    <input
                          type="checkbox" 
                          className="sr-only" 
                          id="toggle"
                          // Agregar lógica de filtro de stock bajo aquí
                        />
                        <label 
                          htmlFor="toggle" 
                          className={`block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer`}
                        >
                          <span 
                            className={`block h-6 w-6 rounded-full bg-white border border-gray-300 transform transition-transform duration-200 ease-in-out`}
                          ></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm">
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Sort
                  </button>
                </div>
              </div>

      {/* Tabla de inventario */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                  <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Cost</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingInventory ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading inventory...</p>
                  </td>
                </tr>
              ) : groupedInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="rounded-full h-14 w-14 bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                    <p className="mt-3 text-gray-500">No hay elementos en el inventario</p>
                    <button 
                      onClick={() => setShowRestockModal(true)}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Restock Product
                    </button>
                        </td>
                      </tr>
              ) : (
                groupedInventory.map((groupedItem, index) => {
                  return (
                    <React.Fragment key={groupedItem.product.id}>
                      {/* Fila principal del producto */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                              {groupedItem.product.imageUrl ? (
                                <img src={groupedItem.product.imageUrl} alt={groupedItem.product.name} className="h-9 w-9 object-cover" />
                                  ) : (
                                    <Package className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {groupedItem.product.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {groupedItem.product.sku}
                              </div>
                              {groupedItem.product.categoryObj && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${getBgClass(groupedItem.product.categoryObj.color)}`}>
                                  {groupedItem.product.categoryObj.name}
                                </span>
                              )}
                                </div>
                              </div>
                            </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {/* Mostraremos las habitaciones en filas secundarias */}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          {groupedItem.totalQuantity.toFixed(1)}g
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          €{groupedItem.avgCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          €{groupedItem.totalCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                          €{groupedItem.totalValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-gray-500 hover:text-gray-700">
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                          </tr>
                      
                      {/* Filas secundarias para cada habitación */}
                      {groupedItem.rooms.map((roomData, roomIdx) => {
                        // Evitar nodos de texto con espacios en blanco
                        return (
                          <tr key={`${groupedItem.product.id}-${roomData.room.id}`} className={roomIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-2">{/* Columna vacía */}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {roomData.room.name}
                              {roomData.room.forSale && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  For Sale
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                              {roomData.quantity.toFixed(1)}g
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                              €{roomData.avgCost.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                              €{(roomData.quantity * roomData.avgCost).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-500">
                              €{(roomData.quantity * groupedItem.product.price).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-500 relative">
                              <div className="relative">
                          <button
                                  onClick={() => {
                                    const menuId = `${groupedItem.product.id}-${roomData.room.id}`;
                                    setOpenMenu(openMenu === menuId ? null : menuId);
                                  }}
                                  className="text-gray-500 hover:text-gray-700 rounded-full h-7 w-7 flex items-center justify-center focus:outline-none"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                          </button>
                                
                                {openMenu === `${groupedItem.product.id}-${roomData.room.id}` && (
                                  <div 
                                    data-menu-id={`${groupedItem.product.id}-${roomData.room.id}`}
                                    className="absolute w-56 divide-y divide-gray-100 overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none origin-right right-0 mr-8 z-50 -bottom-16 transform opacity-100 scale-100"
                                    role="menu"
                                    aria-orientation="vertical"
                                    tabIndex={0}
                                  >
                                    {/* Opcion Convert stock */}
                                    <button
                                      onClick={() => {
                                        setSelectedStock({
                                          productId: groupedItem.product.id,
                                          roomId: roomData.room.id,
                                          productName: groupedItem.product.name,
                                          roomName: roomData.room.name,
                                          quantity: roomData.quantity,
                                          avgCost: roomData.avgCost
                                        });
                                        setEditStockData({
                                          quantity: roomData.quantity.toString()
                                        });
                                        setShowEditStockModal(true);
                                        setOpenMenu(null);
                                      }}
                                      className="group z-50 flex w-full items-center bg-white px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mr-3 h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                                      </svg>
                                      Convert stock
                                    </button>
                                    
                                    {/* Opcion Manage Waste */}
                                    <button
                                      onClick={() => {
                                        setSelectedStock({
                                          productId: groupedItem.product.id,
                                          roomId: roomData.room.id,
                                          productName: groupedItem.product.name,
                                          roomName: roomData.room.name,
                                          quantity: roomData.quantity,
                                          avgCost: roomData.avgCost
                                        });
                                        // Acción para gestionar residuos
                                        setOpenMenu(null);
                                        showNotification('Funcionalidad de gestión de residuos próximamente', 'info');
                                      }}
                                      className="group z-50 flex w-full items-center bg-white px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mr-3 h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                                      </svg>
                                      Manage Waste
                                    </button>
                                    
                                    {/* Opcion Move to room */}
                                    <button
                                      onClick={() => {
                                        setSelectedStock({
                                          productId: groupedItem.product.id,
                                          roomId: roomData.room.id,
                                          productName: groupedItem.product.name,
                                          roomName: roomData.room.name,
                                          quantity: roomData.quantity,
                                          avgCost: roomData.avgCost
                                        });
                                        setTransferStockData({
                                          quantity: '',
                                          destinationRoomId: ''
                                        });
                                        setShowTransferStockModal(true);
                                        setOpenMenu(null);
                                      }}
                                      className="group z-50 flex w-full items-center bg-white px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mr-3 h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                      </svg>
                                      Move to room
                                    </button>
                                    
                                    {/* Opcion Move to branch */}
                                    <button
                                      onClick={() => {
                                        setSelectedStock({
                                          productId: groupedItem.product.id,
                                          roomId: roomData.room.id,
                                          productName: groupedItem.product.name,
                                          roomName: roomData.room.name,
                                          quantity: roomData.quantity,
                                          avgCost: roomData.avgCost
                                        });
                                        // Acción para mover a sucursal
                                        setOpenMenu(null);
                                        showNotification('Funcionalidad de movimiento entre sucursales próximamente', 'info');
                                      }}
                                      className="group z-50 flex w-full items-center bg-white px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mr-3 h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                                      </svg>
                                      Move to branch
                                    </button>
                                    
                                    {/* Opcion Delete */}
                                    <button
                                      onClick={() => {
                                        setSelectedStock({
                                          productId: groupedItem.product.id,
                                          roomId: roomData.room.id,
                                          productName: groupedItem.product.name,
                                          roomName: roomData.room.name,
                                          quantity: roomData.quantity,
                                          avgCost: roomData.avgCost
                                        });
                                        setShowDeleteStockModal(true);
                                        setOpenMenu(null);
                                      }}
                                      className="group z-50 flex w-full items-center bg-white px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                      role="menuitem"
                                      tabIndex={-1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="mr-3 h-5 w-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                        </td>
                      </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

      {/* Resto del código para los modales... */}
      {showRestockModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Restock Product</h2>
              <button 
                onClick={() => setShowRestockModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleRestockSubmitWithSync}>
              <div className={styles.modalBody + " space-y-6"}>
                {/* Product Field */}
                <div>
                  <label htmlFor="product" className="block text-sm font-medium mb-1">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        const isOpen = document.getElementById('product-dropdown')?.classList.contains('hidden');
                        if (isOpen) {
                          document.getElementById('product-dropdown')?.classList.remove('hidden');
                          document.getElementById('product-search')?.focus();
                        } else {
                          document.getElementById('product-dropdown')?.classList.add('hidden');
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-left focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      {restockData.productId 
                        ? products.find(p => p.id === restockData.productId)?.name || 'Select Product'
                        : 'Select Product'}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </button>
                    
                    <div id="product-dropdown" className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto hidden">
                      <div className="sticky top-0 p-2 border-b">
                        <div className="relative">
                          <input
                            id="product-search"
                            type="text"
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-8 pr-3 focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <ul className="py-1">
                        {Array.isArray(products) && products
                          .filter(product => 
                            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                          )
                          .map(product => (
                            <li 
                              key={product.id}
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                setRestockData({ ...restockData, productId: product.id });
                                document.getElementById('product-dropdown')?.classList.add('hidden');
                              }}
                            >
                              <div className="flex items-center px-3 py-2">
                                <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                                  {product.imageUrl ? (
                                    <img 
                                      src={product.imageUrl} 
                                      alt={product.name} 
                                      className="h-10 w-10 rounded-md object-cover"
                                    />
                                  ) : (
                                    <Package className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {product.sku || 'No SKU'} - Stock: {product.stock || 0}
                                  </p>
                                </div>
                                {restockData.productId === product.id && (
                                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </li>
                          ))
                        }
                        {Array.isArray(products) && products.filter(product => 
                          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
                        ).length === 0 && (
                          <li className="px-3 py-4 text-center text-sm text-gray-500">
                            No se encontraron productos
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <select
                      id="product"
                      className="sr-only"
                      value={restockData.productId}
                      onChange={(e) => setRestockData({ ...restockData, productId: e.target.value })}
                      required
                    >
                      <option value="">Select Product</option>
                      {Array.isArray(products) && products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Show preview of selected product if it exists */}
                  {restockData.productId && Array.isArray(products) && products.find(p => p.id === restockData.productId) && (
                    <div className="mt-2 flex items-center p-2 bg-gray-50 rounded-md">
                      <div className="flex-shrink-0 h-12 w-12 bg-white rounded-md flex items-center justify-center mr-3 shadow-sm">
                        {products.find(p => p.id === restockData.productId)?.imageUrl ? (
                          <img 
                            src={products.find(p => p.id === restockData.productId)?.imageUrl} 
                            alt={products.find(p => p.id === restockData.productId)?.name} 
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                        {products.find(p => p.id === restockData.productId)?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          SKU: {products.find(p => p.id === restockData.productId)?.sku || 'N/A'} | 
                          Stock: {products.find(p => p.id === restockData.productId)?.stock || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity Field */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={restockData.quantity}
                    onChange={(e) => setRestockData({ ...restockData, quantity: e.target.value })}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                {/* Room Destination Field */}
                <div>
                  <label htmlFor="room" className="block text-sm font-medium mb-1">
                    Room Destination <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="room"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer"
                      value={restockData.roomId}
                      onChange={(e) => setRestockData({ ...restockData, roomId: e.target.value })}
                      required
                    >
                      <option value="">Select room</option>
                      {Array.isArray(rooms) && rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Product Cost */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="cost" className="block text-sm font-medium">
                      Product Cost (Per Unit)
                    </label>
                    <span className="text-sm text-gray-500">Optional</span>
                  </div>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">€</span>
                    </div>
                    <input
                      type="text"
                      id="cost"
                      className="pl-7 pr-20 w-full border border-gray-300 rounded-md shadow-sm py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                      value={restockData.cost}
                      onChange={(e) => setRestockData({ ...restockData, cost: e.target.value })}
                      placeholder="100"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        className="text-gray-500 px-2 py-1 rounded-md border border-gray-300 bg-gray-50 text-xs font-medium"
                      >
                        UNIT
                      </button>
                    </div>
                  </div>
                </div>

                {/* Supplier Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="supplier" className="block text-sm font-medium">
                      Supplier
                    </label>
                    <span className="text-sm text-gray-500">Optional</span>
                  </div>
                  <div className="relative">
                    <select
                      id="supplier"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer"
                      value={restockData.supplierId || ""}
                      onChange={(e) => setRestockData({ ...restockData, supplierId: e.target.value || null })}
                    >
                      <option value="">Select supplier</option>
                      {Array.isArray(suppliers) && suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Invoice Number Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="invoice" className="block text-sm font-medium">
                      Invoice Number
                    </label>
                    <span className="text-sm text-gray-500">Optional</span>
                  </div>
                  <input
                    type="text"
                    id="invoice"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Invoice Number"
                    value={restockData.invoiceNumber || ""}
                    onChange={(e) => setRestockData({ ...restockData, invoiceNumber: e.target.value || null })}
                  />
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowRestockModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Add Room</h2>
              <button 
                onClick={() => setShowAddRoomModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddRoomSubmit}>
              <div className={styles.modalBody + " space-y-6"}>
                <div>
                  <label htmlFor="roomName" className="block text-sm font-medium mb-1">
                    Room Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="roomName"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={roomData.name}
                    onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
                    placeholder="Room Name"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id="forSale"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                      checked={roomData.forSale}
                      onChange={(e) => setRoomData({ ...roomData, forSale: e.target.checked })}
                    />
                    <label htmlFor="forSale" className="ml-2 block text-sm font-medium text-gray-700">
                      For Sale (Visible in Shop)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enable this option if this room's stock should be available for sale in the shop.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="roomDescription" className="block text-sm font-medium mb-1">
                    Description <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    id="roomDescription"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={roomData.description}
                    onChange={(e) => setRoomData({ ...roomData, description: e.target.value })}
                    placeholder="Room description"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowAddRoomModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmittingRoom}
                >
                  {isSubmittingRoom ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditRoomModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Edit Room</h2>
              <button 
                onClick={() => setShowEditRoomModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditRoomSubmit}>
              <div className={styles.modalBody + " space-y-6"}>
                <div>
                  <label htmlFor="editRoomName" className="block text-sm font-medium mb-1">
                    Room Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="editRoomName"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editRoomData.name}
                    onChange={(e) => setEditRoomData({ ...editRoomData, name: e.target.value })}
                    placeholder="Room Name"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id="editForSale"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                      checked={editRoomData.forSale}
                      onChange={(e) => setEditRoomData({ ...editRoomData, forSale: e.target.checked })}
                    />
                    <label htmlFor="editForSale" className="ml-2 block text-sm font-medium text-gray-700">
                      For Sale (Visible in Shop)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Enable this option if this room's stock should be available for sale in the shop.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="editRoomDescription" className="block text-sm font-medium mb-1">
                    Description <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    id="editRoomDescription"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editRoomData.description}
                    onChange={(e) => setEditRoomData({ ...editRoomData, description: e.target.value })}
                    placeholder="Room description"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowEditRoomModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmittingEditRoom}
                >
                  {isSubmittingEditRoom ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Room Modal */}
      {showDeleteRoomModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
              <button 
                onClick={() => setShowDeleteRoomModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className="flex items-center justify-center mb-4 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <p className="text-center text-gray-700 mb-4">
                ¿Está seguro de que desea eliminar esta sala? Esta acción no se puede deshacer.
              </p>
              <p className="text-center text-sm text-gray-500 mb-6">
                Todos los productos asociados a esta sala se perderán permanentemente.
              </p>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  className="w-full py-3 text-center text-gray-700 border border-gray-300 rounded-md font-medium transition-colors hover:bg-gray-50"
                  onClick={() => setShowDeleteRoomModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={handleDeleteRoom}
                  disabled={isSubmittingDeleteRoom}
                >
                  {isSubmittingDeleteRoom ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Eliminando...
                    </span>
                  ) : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar stock */}
      {showEditStockModal && selectedStock && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Editar Stock</h2>
              <button 
                onClick={() => setShowEditStockModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleEditStock}>
              <div className={styles.modalBody + " space-y-6"}>
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Producto: {selectedStock.productName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Sala: {selectedStock.roomName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Cantidad actual: {selectedStock.quantity.toFixed(1)}g
                  </div>
                </div>
                
                <div>
                  <label htmlFor="editQuantity" className="block text-sm font-medium mb-1">
                    Nueva cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="editQuantity"
                    step="0.1"
                    min="0"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={editStockData.quantity}
                    onChange={(e) => setEditStockData({ ...editStockData, quantity: e.target.value })}
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowEditStockModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal para eliminar stock */}
      {showDeleteStockModal && selectedStock && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Confirmar eliminación</h2>
              <button 
                onClick={() => setShowDeleteStockModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className="flex items-center justify-center mb-6 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">¿Está seguro de eliminar este stock?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Esta acción eliminará permanentemente <span className="font-semibold">{selectedStock.quantity.toFixed(1)}g</span> de <span className="font-semibold">{selectedStock.productName}</span> en la habitación <span className="font-semibold">{selectedStock.roomName}</span>.
                </p>
                <p className="text-sm text-red-600">
                  Esta acción no se puede deshacer.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  className="w-full py-3 text-center text-gray-700 border border-gray-300 rounded-md font-medium transition-colors hover:bg-gray-50"
                  onClick={() => setShowDeleteStockModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="w-full py-3 text-center text-white bg-red-600 rounded-md font-medium hover:bg-red-700 transition-colors"
                  onClick={handleDeleteStock}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Eliminando...
                    </span>
                  ) : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para trasladar stock */}
      {showTransferStockModal && selectedStock && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className="text-xl font-bold text-gray-900">Trasladar Stock</h2>
              <button 
                onClick={() => setShowTransferStockModal(false)}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleTransferStock}>
              <div className={styles.modalBody + " space-y-6"}>
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Producto: {selectedStock.productName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Sala origen: {selectedStock.roomName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Cantidad disponible: {selectedStock.quantity.toFixed(1)}g
                  </div>
                </div>
                
                <div>
                  <label htmlFor="transferQuantity" className="block text-sm font-medium mb-1">
                    Cantidad a trasladar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="transferQuantity"
                    step="0.1"
                    min="0.1"
                    max={selectedStock.quantity}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={transferStockData.quantity}
                    onChange={(e) => setTransferStockData({ ...transferStockData, quantity: e.target.value })}
                    placeholder="0.0"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="destinationRoom" className="block text-sm font-medium mb-1">
                    Sala destino <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="destinationRoom"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer"
                      value={transferStockData.destinationRoomId}
                      onChange={(e) => setTransferStockData({ ...transferStockData, destinationRoomId: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar sala destino</option>
                      {rooms
                        .filter(room => room.id !== selectedStock.roomId)
                        .map(room => (
                          <option key={room.id} value={room.id}>{room.name}</option>
                        ))
                      }
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setShowTransferStockModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Trasladando...
                    </span>
                  ) : "Trasladar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Notificación toast */}
      {notification && (
        <div 
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
            notification.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${
            notification.type === 'success' ? 'bg-green-600 text-white' :
            notification.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center">
            {notification.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
