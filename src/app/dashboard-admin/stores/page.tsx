"use client";

import { useState, useEffect } from "react";
import { Building, Plus, Edit, Trash, Check, X, Key, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  username: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  
  // Estado para el modal de nueva tienda
  const [showNewStoreModal, setShowNewStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreUsername, setNewStoreUsername] = useState("");
  const [newStorePassword, setNewStorePassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para el modal de edición de tienda
  const [showEditStoreModal, setShowEditStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editStoreUsername, setEditStoreUsername] = useState("");
  const [editStorePassword, setEditStorePassword] = useState("");
  
  // Cargar tiendas al montar el componente
  useEffect(() => {
    fetchStores();
  }, []);
  
  const fetchStores = async () => {
    setIsLoading(true);
    try {
      console.log("Iniciando fetchStores");
      const response = await fetch("/api/stores");
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error del servidor:", errorData);
        throw new Error(errorData.error || "Error al cargar tiendas");
      }
      
      const data = await response.json();
      console.log("Datos de tiendas recibidos:", data);
      setStores(data.stores || []);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      setError("No se pudieron cargar las tiendas. Intente nuevamente. " + 
        (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStoreName || !newStoreUsername || !newStorePassword) {
      setError("Todos los campos son requeridos");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStoreName,
          username: newStoreUsername,
          password: newStorePassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al crear tienda");
      }
      
      // Limpiar formulario y cerrar modal
      setNewStoreName("");
      setNewStoreUsername("");
      setNewStorePassword("");
      setShowNewStoreModal(false);
      
      // Recargar lista de tiendas
      fetchStores();
      
    } catch (error: any) {
      console.error("Error al crear tienda:", error);
      setError(error.message || "Error al crear tienda. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleToggleStatus = async (storeId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al actualizar estado");
      }
      
      // Actualizar tienda en la lista local
      setStores(prev => 
        prev.map(store => 
          store.id === storeId ? { ...store, status: newStatus as any } : store
        )
      );
      
    } catch (error: any) {
      console.error("Error al cambiar estado:", error);
      setError(error.message || "Error al cambiar estado. Intente nuevamente.");
    }
  };
  
  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setEditStoreName(store.name);
    setEditStoreUsername(store.username);
    setEditStorePassword("");
    setShowEditStoreModal(true);
  };
  
  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStore) return;
    
    // Validar que al menos haya un campo para actualizar
    if (!editStoreName && !editStoreUsername && !editStorePassword) {
      setError("Debe modificar al menos un campo");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      // Preparar datos a actualizar
      const updateData: any = {};
      if (editStoreName && editStoreName !== editingStore.name) {
        updateData.name = editStoreName;
      }
      if (editStoreUsername && editStoreUsername !== editingStore.username) {
        updateData.username = editStoreUsername;
      }
      if (editStorePassword) {
        updateData.password = editStorePassword;
      }
      
      // Solo enviar si hay cambios
      if (Object.keys(updateData).length === 0) {
        setShowEditStoreModal(false);
        return;
      }
      
      const response = await fetch(`/api/stores/${editingStore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al actualizar tienda");
      }
      
      // Actualizar tienda en la lista local
      setStores(prev => 
        prev.map(store => 
          store.id === editingStore.id 
            ? { 
                ...store, 
                name: updateData.name || store.name,
                username: updateData.username || store.username
              } 
            : store
        )
      );
      
      // Cerrar modal y limpiar
      setShowEditStoreModal(false);
      setEditingStore(null);
      
    } catch (error: any) {
      console.error("Error al actualizar tienda:", error);
      setError(error.message || "Error al actualizar tienda. Intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("¿Está seguro de eliminar esta tienda? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al eliminar tienda");
      }
      
      // Eliminar tienda de la lista local
      setStores(prev => prev.filter(store => store.id !== storeId));
      
    } catch (error: any) {
      console.error("Error al eliminar tienda:", error);
      setError(error.message || "Error al eliminar tienda. Intente nuevamente.");
    }
  };
  
  const handleLoginAsStore = async (store: Store) => {
    if (store.status !== "ACTIVE") {
      alert("No se puede acceder a una tienda inactiva");
      return;
    }
    
    try {
      const response = await fetch("/api/auth/admin-store-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || "Error al acceder a la tienda");
      }
      
      // Redirigir al dashboard de tienda
      console.log("Acceso exitoso, redirigiendo a dashboard de tienda");
      router.push("/dashboard");
      
    } catch (error: any) {
      console.error("Error al acceder como tienda:", error);
      setError(error.message || "Error al acceder a la tienda. Intente nuevamente.");
    }
  };
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Tiendas</h1>
        <button
          onClick={() => setShowNewStoreModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tienda
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay tiendas registradas</h3>
          <p className="mt-2 text-gray-500">Comience creando una nueva tienda</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de creación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{store.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {store.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(store.id, store.status)}
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        store.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {store.status === "ACTIVE" ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      {store.status === "ACTIVE" ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(store.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleLoginAsStore(store)}
                        title="Acceder como tienda"
                        className="text-green-600 hover:text-green-900"
                        disabled={store.status !== "ACTIVE"}
                      >
                        <LogIn className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditStore(store)}
                        title="Editar tienda"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        title="Eliminar tienda"
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
      
      {/* Modal de nueva tienda */}
      {showNewStoreModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Crear nueva tienda</h3>
            </div>
            
            <form onSubmit={handleCreateStore}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nombre de tienda
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={newStoreUsername}
                    onChange={(e) => setNewStoreUsername(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={newStorePassword}
                    onChange={(e) => setNewStorePassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowNewStoreModal(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {isSubmitting ? "Creando..." : "Crear tienda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de edición de tienda */}
      {showEditStoreModal && editingStore && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Editar tienda</h3>
              <p className="text-sm text-gray-500 mt-1">
                Deje vacío cualquier campo que no desee cambiar
              </p>
            </div>
            
            <form onSubmit={handleUpdateStore}>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                    Nombre de tienda
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editStoreName}
                    onChange={(e) => setEditStoreName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Dejar igual"
                  />
                </div>
                
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    id="edit-username"
                    value={editStoreUsername}
                    onChange={(e) => setEditStoreUsername(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Dejar igual"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between">
                    <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700">
                      Nueva contraseña
                    </label>
                    <span className="text-xs text-gray-500">Dejar vacío para no cambiar</span>
                  </div>
                  <div className="mt-1 relative">
                    <input
                      type="password"
                      id="edit-password"
                      value={editStorePassword}
                      onChange={(e) => setEditStorePassword(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Nueva contraseña"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Key className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setShowEditStoreModal(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                >
                  {isSubmitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 