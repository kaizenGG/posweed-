"use client";

import { useEffect, useState } from "react";

export default function DashboardAdminPage() {
  const [userData, setUserData] = useState<{
    name?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    // Obtener la cookie de sesión
    function getCookie(name: string) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift();
      }
      return null;
    }

    const token = getCookie("session_token");
    
    if (token) {
      // Verificar el token con el servidor
      fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.user) {
            setUserData({
              name: data.user.name,
              email: data.user.email
            });
          }
        })
        .catch(error => {
          console.error("Error al verificar token:", error);
        });
    }
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Panel de Administración
      </h1>
      
      {userData ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Bienvenido, {userData.name || "Administrador"}
          </h2>
          <p className="text-gray-600">
            Este es tu panel de control administrativo donde podrás gestionar tiendas y usuarios.
          </p>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <h3 className="font-medium text-indigo-700 mb-2">Tiendas Activas</h3>
              <p className="text-2xl font-bold">1</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-700 mb-2">Usuarios</h3>
              <p className="text-2xl font-bold">2</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-medium text-purple-700 mb-2">Productos Totales</h3>
              <p className="text-2xl font-bold">0</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-700 mb-2">Ventas Globales</h3>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="font-medium mb-4">Acciones Rápidas</h3>
            <div className="flex flex-wrap gap-4">
              <a 
                href="/dashboard-admin/stores" 
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Gestionar Tiendas
              </a>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50" disabled>
                Gestionar Usuarios
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50" disabled>
                Ver Estadísticas
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-pulse bg-white p-6 rounded-lg shadow-md">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      )}
    </div>
  );
} 