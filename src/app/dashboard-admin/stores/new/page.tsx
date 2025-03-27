"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";

export default function NewStorePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setDebugInfo(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      username: formData.get("username"),
      password: formData.get("password"),
      email: formData.get("email") || null,
      phone: formData.get("phone") || null,
      status: formData.get("status") || "ACTIVE",
      address: formData.get("address") || null,
      description: formData.get("description") || null,
      image: formData.get("image") || null,
    };
    
    try {
      console.log("Enviando datos:", { ...data, password: "***" });
      
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include", // Incluir cookies para autenticación
      });
      
      const result = await response.json();
      
      // Guardar información de depuración
      setDebugInfo({
        status: response.status,
        statusText: response.statusText,
        result
      });
      
      if (!response.ok) {
        throw new Error(result.message || result.details || "Error al crear la tienda");
      }
      
      // Redirigir a la lista de tiendas después de crear exitosamente
      router.push("/dashboard-admin/stores");
      router.refresh();
    } catch (error: any) {
      console.error("Error al crear la tienda:", error);
      setError(error.message || "Error al crear la tienda");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard-admin/stores"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a tiendas
        </Link>
        <h1 className="text-2xl font-bold">Nueva Tienda</h1>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          {debugInfo && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer">Detalles técnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre de la tienda*
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500">Nombre que identificará a la tienda en el sistema</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nombre de usuario*
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500">Este nombre de usuario será utilizado para acceder al sistema</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña*
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500">Debe tener al menos 8 caracteres</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="status"
                name="status"
                defaultValue="ACTIVE"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                id="address"
                name="address"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                URL de la imagen
              </label>
              <input
                type="url"
                id="image"
                name="image"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="text-xs text-gray-500">
                Deje en blanco para usar una imagen predeterminada
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="rounded-md bg-indigo-50 p-4 border border-indigo-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.75.75 0 00.736-.54l.15-.65a.75.75 0 00-.368-.884.75.75 0 00-.328-.182L9 9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-indigo-800">Información importante</h3>
                  <div className="mt-2 text-sm text-indigo-700">
                    <p>Cada tienda operará con su propia base de datos independiente. Esto garantiza:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Mayor seguridad y aislamiento de datos</li>
                      <li>Escalabilidad y rendimiento optimizado</li>
                      <li>Administración modular del sistema</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-4">
            <Link
              href="/dashboard-admin/stores"
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
            >
              <Store className="w-4 h-4" />
              {isSubmitting ? "Creando..." : "Crear Tienda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 