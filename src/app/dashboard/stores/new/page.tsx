"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StoreStatus } from "@prisma/client";

export default function NewStorePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    
    const formData = new FormData(e.currentTarget);
    const storeData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      status: formData.get("status") as StoreStatus,
      image: formData.get("image") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };
    
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storeData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear la tienda");
      }
      
      router.push("/dashboard-admin/stores");
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Ocurrió un error al crear la tienda");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crear Nueva Tienda</h1>
        <p className="text-gray-500 mt-2">
          Llena el formulario para crear una nueva tienda de cannabis
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre de la Tienda *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="col-span-2">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <div className="flex">
                <div>
                  <p className="text-sm text-amber-700">
                    <strong>Credenciales de acceso para la tienda.</strong> Estas credenciales permitirán que la tienda acceda a su propio sistema de punto de venta independiente.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Usuario de la Tienda *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Este será el nombre de usuario para acceder al sistema POS de la tienda.
            </p>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña de la Tienda *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Contraseña para acceder al sistema POS de la tienda.
            </p>
          </div>
          
          <div className="col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Dirección
            </label>
            <input
              id="address"
              name="address"
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="status"
              name="status"
              defaultValue="ACTIVE"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
              <option value="SUSPENDED">Suspendida</option>
            </select>
          </div>
          
          <div className="col-span-2">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700">
              URL de Imagen
            </label>
            <input
              id="image"
              name="image"
              type="url"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar Tienda"}
          </button>
        </div>
      </form>
    </div>
  );
} 