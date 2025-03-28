"use client";

import { useState, useEffect } from "react";
import { Package, Plus, Edit, Trash, Search, Eye, Filter, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "../layout";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  category: string;
  description?: string;
  imageUrl?: string;
  stock: number;
  lowStockThreshold?: number;
  priceStrategy?: string;
  createdAt: string;
  categoryObj?: Category;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  unit: string;
  stockAlert: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { isNavigating } = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    categoryId: "",
    description: "",
    lowStockThreshold: "",
    priceStrategy: "",
    image: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'sales'>('inventory');
  
  // Price strategies - in a real app, these would be fetched from an API
  const priceStrategies = [
    "Standard",
    "Premium",
    "Budget",
    "Promotional",
    "Wholesale",
    "Custom"
  ];

  // Definir fetchData fuera del useEffect para usarlo en otros lugares
  const fetchData = async () => {
    try {
      console.log("[Products Page] Iniciando carga de productos...");
      setIsLoading(true);
      
      // Cargar categorías
      console.log("[Products Page] Obteniendo categorías...");
      const categoriesResponse = await fetch('/api/categories');
      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }
      const categoriesData = await categoriesResponse.json();
      console.log(`[Products Page] Respuesta de categorías:`, categoriesData);
      
      // Verificar si categoriesData es un objeto con propiedad categories
      let categoriesList = [];
      if (categoriesData && typeof categoriesData === 'object') {
        if ('categories' in categoriesData && Array.isArray(categoriesData.categories)) {
          console.log(`[Products Page] ${categoriesData.categories.length} categorías encontradas`);
          categoriesList = categoriesData.categories;
        } else if (Array.isArray(categoriesData)) {
          console.log(`[Products Page] ${categoriesData.length} categorías encontradas (formato array)`);
          categoriesList = categoriesData;
        }
      } else {
        console.warn("[Products Page] Formato de respuesta de categorías inesperado:", categoriesData);
      }
      
      // Filtrar y validar categorías
      const validCategories = categoriesList.filter((cat: any) => 
        cat && typeof cat === 'object' && 'id' in cat && 'name' in cat && 'color' in cat
      );
      
      if (validCategories.length !== categoriesList.length) {
        console.warn(`[Products Page] Se filtraron ${categoriesList.length - validCategories.length} categorías con formato inválido`);
      }
      
      setCategories(validCategories);
      console.log(`[Products Page] ${validCategories.length} categorías guardadas en estado:`, validCategories);
      
      // Cargar productos con debug adicional
      console.log("[Products Page] Obteniendo productos...");
      const productsResponse = await fetch('/api/products');
      console.log(`[Products Page] Estado de respuesta de productos: ${productsResponse.status}`);
      
      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error(`[Products Page] Error en respuesta de productos: ${errorText}`);
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
      }
      
      // Obtener el texto completo para debug
      const responseText = await productsResponse.text();
      console.log(`[Products Page] Respuesta de API productos (primeros 500 caracteres): ${responseText.substring(0, 500)}`);
      
      let productsData;
      try {
        // Parsear el texto a JSON
        productsData = JSON.parse(responseText);
        console.log(`[Products Page] Productos parseados:`, productsData);
        
        // Manejar el nuevo formato de respuesta de la API {success: true, products: [...]}
        if (productsData && typeof productsData === 'object' && 'success' in productsData && 'products' in productsData && Array.isArray(productsData.products)) {
          console.log(`[Products Page] Formato nuevo: ${productsData.products.length} productos encontrados`);
          productsData = productsData.products;
        } else if (!Array.isArray(productsData)) {
          console.log("[Products Page] No es formato nuevo ni array, intentando adaptar");
          // Si no es un array ni tiene la estructura esperada, intentar adaptarlo
          productsData = [];
        }
        
        if (Array.isArray(productsData) && productsData.length > 0) {
          console.log("[Products Page] Primer producto:", JSON.stringify(productsData[0]));
        }
      } catch (error) {
        console.error("[Products Page] Error al parsear respuesta JSON:", error);
        throw new Error('Invalid JSON response');
      }
      
      setProducts(productsData);
      console.log(`[Products Page] ${productsData.length} productos cargados y guardados en estado`);
      
      setIsLoading(false);
    } catch (error) {
      console.error('[Products Page] Error fetching data:', error);
      setError('Failed to load products. Please try again.');
      setIsLoading(false);
    }
  };

  // Modificamos el useEffect para un mejor manejo de carga
  useEffect(() => {
    // Si estamos navegando, no hacemos nada (permitimos que se muestre el layout primero)
    if (isNavigating) return;
    
    // Después de que la página se muestre, iniciamos la carga de datos
    const loadData = async () => {
      try {
        await fetchData();
      } finally {
        // Ocultamos el indicador de carga inicial después de 300ms para evitar flasheos
        setTimeout(() => {
          setInitialLoad(false);
        }, 300);
      }
    };
    
    loadData();
  }, [isNavigating]);

  // Función para cargar los detalles del producto cuando se selecciona uno
  const fetchProductDetails = async (productId: string) => {
    if (!productId) return;
    
    setIsLoadingDetails(true);
    setDetailsError(null);
    
    try {
      console.log(`[Products Page] Obteniendo detalles del producto: ${productId}`);
      const response = await fetch(`/api/products/${productId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al cargar detalles del producto (${response.status})`);
      }
      
      const data = await response.json();
      console.log(`[Products Page] Detalles del producto recibidos:`, data);
      setProductDetails(data);
    } catch (error) {
      console.error("[Products Page] Error al cargar detalles del producto:", error);
      setDetailsError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  // Función para manejar la vista de detalles del producto
  const handleViewProduct = (productId: string) => {
    setSelectedProductId(productId);
    fetchProductDetails(productId);
    setShowProductDetailsModal(true);
  };
  
  // Función para cerrar la modal de detalles
  const closeProductDetailsModal = () => {
    setShowProductDetailsModal(false);
    setSelectedProductId(null);
    setProductDetails(null);
    setActiveTab('inventory');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (!file) {
      return;
    }
    
    // Validar tipo de archivo
    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!validImageTypes.includes(file.type)) {
      setError(`Tipo de archivo no válido. Por favor usa: JPG, PNG, GIF, WEBP o SVG`);
      return;
    }
    
    // Validar tamaño (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(`La imagen es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). El tamaño máximo es 5MB.`);
      return;
    }
    
    // Si todo está bien, actualizar el estado
    setError(""); // Limpiar errores previos
    console.log(`Imagen seleccionada: ${file.name}, tipo: ${file.type}, tamaño: ${file.size} bytes`);
    
    // Mostrar mensaje informativo sobre la optimización
    const infoMessage = document.createElement('div');
    infoMessage.className = 'text-xs text-green-600 mt-1';
    infoMessage.innerHTML = `
      <span class="font-medium">Optimización:</span> La imagen será automáticamente optimizada:
      <ul class="list-disc list-inside ml-1 mt-0.5">
        <li>Convertida a formato WebP para mejor calidad/tamaño</li>
        <li>Redimensionada si excede 1200x1200px</li>
        <li>Comprimida para rendimiento óptimo</li>
      </ul>
    `;
    
    // Reemplazar el mensaje "No image selected" con este nuevo mensaje
    const noImageText = document.querySelector('#product-image-container p');
    if (noImageText) {
      noImageText.replaceWith(infoMessage);
    }
    
    setNewProduct(prev => ({ ...prev, image: file }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProduct.name || !newProduct.price || !newProduct.categoryId) {
      setError("Name, price, and category are required");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price);
      formData.append("categoryId", newProduct.categoryId);
      
      if (newProduct.description) {
        formData.append("description", newProduct.description);
      }
      
      if (newProduct.lowStockThreshold) {
        formData.append("lowStockThreshold", newProduct.lowStockThreshold);
      }
      
      if (newProduct.priceStrategy) {
        formData.append("priceStrategy", newProduct.priceStrategy);
      }
      
      if (newProduct.image) {
        formData.append("image", newProduct.image);
      }
      
      const response = await fetch("/api/products", {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error creating product");
      }
      
      // Reset form and close modal
      setNewProduct({
        name: "",
        price: "",
        categoryId: "",
        description: "",
        lowStockThreshold: "",
        priceStrategy: "",
        image: null
      });
      setShowAddProductModal(false);
      
      // Refresh products list
      fetchData();
      
    } catch (error: any) {
      console.error("Error creating product:", error);
      setError(error.message || "Error creating product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error deleting product");
      }
      
      // Remove product from local list
      setProducts(prev => prev.filter(product => product.id !== productId));
      
    } catch (error: any) {
      console.error("Error deleting product:", error);
      setError(error.message || "Error deleting product. Please try again.");
    }
  };

  // Filter products based on search query
  const filteredProducts = searchQuery.length > 0 && Array.isArray(products) 
    ? products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((typeof product.category === 'string' ? product.category : 
          product.categoryObj?.name || "")).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : Array.isArray(products) ? products : [];

  // Get category name for display
  const getCategoryName = (product: Product): string => {
    // Si el producto tiene el objeto de categoría, usar ese nombre
    if (product.categoryObj && typeof product.categoryObj === 'object' && 'name' in product.categoryObj) {
      return product.categoryObj.name;
    }
    
    // Si el producto tiene categoryId, buscar la categoría por ID
    if (product.categoryId && Array.isArray(categories)) {
      const category = categories.find(c => c.id === product.categoryId);
      if (category && typeof category === 'object' && 'name' in category) {
        return category.name;
      }
    }
    
    // Si hay un valor de categoría antigua (texto), usar ese
    if (product.category && typeof product.category === 'string') {
      return product.category;
    }
    
    // Si no hay nada, mostrar "-"
    return "-";
  };

  // Crear la clase dinámica basada en el color de la categoría
  const getBgClass = (color: string): string => {
    const colorMap: Record<string, string> = {
      'red': 'bg-red-200 text-red-800',
      'orange': 'bg-orange-200 text-orange-800',
      'amber': 'bg-amber-200 text-amber-800',
      'yellow': 'bg-yellow-200 text-yellow-800',
      'lime': 'bg-lime-200 text-lime-800',
      'green': 'bg-green-200 text-green-800',
      'emerald': 'bg-emerald-200 text-emerald-800',
      'teal': 'bg-teal-200 text-teal-800',
      'cyan': 'bg-cyan-200 text-cyan-800',
      'sky': 'bg-sky-200 text-sky-800',
      'blue': 'bg-blue-200 text-blue-800',
      'indigo': 'bg-indigo-200 text-indigo-800',
      'violet': 'bg-violet-200 text-violet-800',
      'purple': 'bg-purple-200 text-purple-800',
      'fuchsia': 'bg-fuchsia-200 text-fuchsia-800',
      'pink': 'bg-pink-200 text-pink-800',
      'rose': 'bg-rose-200 text-rose-800',
      // Colores por defecto
      '#FF0000': 'bg-red-200 text-red-800',
      '#FFA500': 'bg-orange-200 text-orange-800',
      '#FFFF00': 'bg-yellow-200 text-yellow-800',
      '#008000': 'bg-green-200 text-green-800',
      '#0000FF': 'bg-blue-200 text-blue-800',
      '#4B0082': 'bg-indigo-200 text-indigo-800',
      '#9400D3': 'bg-purple-200 text-purple-800',
      '#FF00FF': 'bg-fuchsia-200 text-fuchsia-800',
      '#FF1493': 'bg-pink-200 text-pink-800',
    };
    
    // Usar el acceso seguro a propiedades con tipo Record
    return colorMap[color] || 'bg-green-200 text-green-800';
  };

  // Function to navigate to product detail with a smooth transition
  const navigateToProduct = (productId: string) => {
    // Añadir clase para fade out
    document.body.classList.add('page-transition-out');
    
    // Después de un breve delay, navegar a la página
    setTimeout(() => {
      router.push(`/dashboard/products/${productId}`);
    }, 150);
  };

  return (
    <div className="relative min-h-[200px]">
      {initialLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-2"></div>
          <p className="text-sm text-gray-500">Cargando...</p>
        </div>
      )}
      <div className={initialLoad ? "opacity-50" : "animate-fade-in"}>
        <div className="p-4 mx-auto max-w-7xl">
          {/* Add this style for page transitions */}
          <style jsx global>{`
            body {
              transition: opacity 0.15s ease-in-out;
            }
            .page-transition-out {
              opacity: 0.8;
            }
          `}</style>
          
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Products Management</h1>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="mb-4">
            <div className="relative w-full md:w-96">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Search by Name or SKU"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          {isLoading && !initialLoad ? (
            <div className="flex justify-center my-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : Array.isArray(filteredProducts) && filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-5 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-2 text-gray-500">
                {searchQuery 
                  ? "Try different search terms" 
                  : "Start by adding your first product"}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden animate-fade-in">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Strategy
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(filteredProducts) && filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-9 w-9 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              <Package className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              <button onClick={() => navigateToProduct(product.id)} className="hover:text-blue-600 hover:underline cursor-pointer">
                                {product.name}
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {product.categoryObj ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBgClass(product.categoryObj.color)}`}>
                            {product.categoryObj.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">{getCategoryName(product)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(product.price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {product.priceStrategy || "Standard"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => navigateToProduct(product.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Add Product Modal */}
          {showAddProductModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
                </div>
                
                <form onSubmit={handleAddProduct}>
                  <div className="p-5 space-y-4">
                    {/* Image Selection */}
                    <div className="flex flex-col items-center mb-4" id="product-image-container">
                      <div className="w-32 h-32 border border-gray-300 rounded-md flex items-center justify-center mb-2 bg-gray-50">
                        {newProduct.image ? (
                          <img 
                            src={URL.createObjectURL(newProduct.image)} 
                            alt="Product preview" 
                            className="h-full w-full object-contain p-2" 
                          />
                        ) : (
                          <Package className="h-12 w-12 text-gray-300" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => document.getElementById('product-image')?.click()}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      >
                        Select Image
                      </button>
                      <input
                        id="product-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-1">No image selected</p>
                    </div>
                    
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 after:content-['*'] after:text-red-500">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={newProduct.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    {/* Category */}
                    <div>
                      <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 after:content-['*'] after:text-red-500">
                        Categoría
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          id="categoryId"
                          onClick={() => {
                            setIsCategoryDropdownOpen(prev => !prev);
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-left text-sm focus:outline-none focus:ring-green-500 focus:border-green-500 relative"
                        >
                          {newProduct.categoryId
                            ? (() => {
                                const selectedCategory = categories.find(cat => cat.id === newProduct.categoryId);
                                return (
                                  <span className="flex items-center">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBgClass(selectedCategory?.color || 'green')}`}>
                                      {selectedCategory?.name || "Seleccionar Categoría"}
                                    </span>
                                  </span>
                                );
                              })()
                            : "Seleccionar Categoría"}
                          
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </button>
                        
                        {isCategoryDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                            {Array.isArray(categories) && categories.map(category => (
                              <div
                                key={category.id}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                                onClick={() => {
                                  setNewProduct(prev => ({ ...prev, categoryId: category.id }));
                                  setIsCategoryDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-center">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBgClass(category.color)}`}>
                                    {category.name}
                                  </span>
                                </div>
                                
                                {category.id === newProduct.categoryId && (
                                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600">
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <select
                          id="categoryId-hidden"
                          name="categoryId"
                          value={newProduct.categoryId}
                          onChange={handleInputChange}
                          className="sr-only"
                          required
                        >
                          <option value="">Seleccionar Categoría</option>
                          {Array.isArray(categories) && categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Price with currency symbol */}
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 after:content-['*'] after:text-red-500">
                        Price
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          id="price"
                          name="price"
                          min="0"
                          step="0.01"
                          value={newProduct.price}
                          onChange={handleInputChange}
                          className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Price Strategy */}
                    <div>
                      <label htmlFor="priceStrategy" className="block text-sm font-medium text-gray-700">
                        Price Strategy <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <select
                        id="priceStrategy"
                        name="priceStrategy"
                        value={newProduct.priceStrategy}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      >
                        <option value="">Select an option</option>
                        {priceStrategies.map(strategy => (
                          <option key={strategy} value={strategy}>{strategy}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={newProduct.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="Product description"
                      />
                    </div>
                    
                    {/* Low Stock Threshold */}
                    <div>
                      <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700">
                        Low Stock Threshold <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        id="lowStockThreshold"
                        name="lowStockThreshold"
                        min="0"
                        value={newProduct.lowStockThreshold}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        placeholder="e.g., 10"
                      />
                    </div>
                  </div>
                  
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(false)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : "Add Product"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Details Modal */}
          {showProductDetailsModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
                {/* Header con botón de cerrar y tabs integrados */}
                <div className="px-6 py-3 border-b border-gray-200 flex flex-col sticky top-0 bg-white z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {productDetails?.product?.name || "Detalles del Producto"}
                    </h3>
                    <button 
                      onClick={closeProductDetailsModal}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Tabs integrados en el header */}
                  <div className="flex space-x-4 -mb-px">
                    <button 
                      className={`pb-2 px-1 ${activeTab === 'inventory' ? 'border-b-2 border-green-500 text-green-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('inventory')}
                    >
                      Inventario
                    </button>
                    <button
                      className={`pb-2 px-1 ${activeTab === 'transactions' ? 'border-b-2 border-green-500 text-green-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('transactions')}
                    >
                      Transacciones
                    </button>
                    <button
                      className={`pb-2 px-1 ${activeTab === 'sales' ? 'border-b-2 border-green-500 text-green-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setActiveTab('sales')}
                    >
                      Ventas
                    </button>
                  </div>
                </div>
                
                {/* Contenido */}
                <div className="p-4">
                  {isLoadingDetails ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                    </div>
                  ) : detailsError ? (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 text-sm">
                      <p>{detailsError}</p>
                      <button 
                        onClick={() => fetchProductDetails(selectedProductId || '')}
                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                      >
                        Intentar de nuevo
                      </button>
                    </div>
                  ) : productDetails ? (
                    <div>
                      {/* Información principal del producto - versión compacta */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Imagen del producto - más pequeña */}
                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center">
                          {productDetails.product?.imageUrl ? (
                            <img 
                              src={productDetails.product.imageUrl} 
                              alt={productDetails.product.name} 
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Información básica */}
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-1">
                            {productDetails.product?.categoryObj && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBgClass(productDetails.product.categoryObj.color)}`}>
                                {productDetails.product.categoryObj.name}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                              SKU: {productDetails.product?.sku}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Precio:</span>
                              <span className="ml-1 font-semibold">
                                {new Intl.NumberFormat('es-ES', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(productDetails.product?.price || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Estrategia:</span>
                              <span className="ml-1">{productDetails.product?.priceStrategy || "Standard"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Stock:</span>
                              <span className="ml-1">{productDetails.inventory?.totalQuantity || 0} uds</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Valor:</span>
                              <span className="ml-1">
                                {new Intl.NumberFormat('es-ES', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(productDetails.inventory?.estimatedValue || 0)}
                              </span>
                            </div>
                          </div>
                          
                          {productDetails.product?.description && (
                            <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {productDetails.product.description}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Contenido de las pestañas */}
                      <div>
                        {activeTab === 'inventory' && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Inventario por Ubicación</h3>
                            {productDetails.inventory?.items && productDetails.inventory.items.length > 0 ? (
                              <div className="overflow-x-auto rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ubicación
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cant.
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Costo Prom.
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Valor
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {productDetails.inventory.items.map((item: any) => (
                                      <tr key={item.id}>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {item.room?.name || 'Desconocido'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {item.quantity}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {new Intl.NumberFormat('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR'
                                          }).format(item.avgCost || 0)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                          {new Intl.NumberFormat('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR'
                                          }).format((item.quantity || 0) * (item.avgCost || 0))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic text-sm">No hay elementos de inventario disponibles</p>
                            )}
                          </div>
                        )}
                        
                        {activeTab === 'transactions' && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Historial de Transacciones</h3>
                            {productDetails.transactions && productDetails.transactions.length > 0 ? (
                              <div className="overflow-x-auto rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ubicación
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cantidad
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Costo
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {productDetails.transactions.map((transaction: any) => (
                                      <tr key={transaction.id}>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {new Date(transaction.createdAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                          <span className={`px-1.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${transaction.type === 'RESTOCK' ? 'bg-green-100 text-green-800' : 
                                              transaction.type === 'TRANSFER' ? 'bg-blue-100 text-blue-800' :
                                              transaction.type === 'ADJUSTMENT' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-red-100 text-red-800'}`}
                                          >
                                            {transaction.type === 'RESTOCK' ? 'Reposición' :
                                              transaction.type === 'TRANSFER' ? 'Transferencia' :
                                              transaction.type === 'ADJUSTMENT' ? 'Ajuste' :
                                              'Venta'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {transaction.room?.name || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {transaction.quantity > 0 ? `+${transaction.quantity}` : transaction.quantity}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {transaction.cost ? new Intl.NumberFormat('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR'
                                          }).format(transaction.cost) : 'N/A'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic text-sm">No hay transacciones disponibles</p>
                            )}
                          </div>
                        )}
                        
                        {activeTab === 'sales' && (
                          <div>
                            <h3 className="text-sm font-medium mb-2">Historial de Ventas</h3>
                            {productDetails.sales && productDetails.sales.length > 0 ? (
                              <div className="overflow-x-auto rounded-md border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Factura
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cant.
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Precio
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {productDetails.sales.map((sale: any) => (
                                      <tr key={sale.id}>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {new Date(sale.createdAt).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {sale.sale?.invoiceNumber || 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {sale.quantity}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {new Intl.NumberFormat('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR'
                                          }).format(sale.price || 0)}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                          {new Intl.NumberFormat('es-ES', {
                                            style: 'currency',
                                            currency: 'EUR'
                                          }).format(sale.subtotal || 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic text-sm">No hay ventas disponibles</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 text-sm">No se encontraron detalles del producto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 