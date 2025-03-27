import { getAuth } from "@/auth";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { PlusCircle, Store, Eye, Edit, Trash } from "lucide-react";
import { redirect } from "next/navigation";

export default async function StoresPage() {
  const session = await getAuth();
  
  if (!session?.user) {
    redirect("/login-admin");
  }
  
  // Verificar rol de administrador
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/login-admin?error=access_denied");
  }
  
  const stores = await prisma.store.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tiendas</h1>
          <Link
            href="/dashboard-admin/stores/new"
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Tienda
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tienda
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado por
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Store className="h-12 w-12 text-gray-400" />
                        <div className="text-gray-500 text-lg">No hay tiendas registradas</div>
                        <Link
                          href="/dashboard-admin/stores/new"
                          className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Crear Nueva Tienda
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stores.map((store) => (
                    <tr key={store.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {store.image ? (
                              <img src={store.image} alt={store.name} className="h-10 w-10 object-cover" />
                            ) : (
                              <Store className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{store.name}</div>
                            <div className="text-sm text-gray-500">{store.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {store.address || "No registrada"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {store.user?.name || "Usuario Desconocido"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          store.status === "ACTIVE" 
                            ? "bg-green-100 text-green-800" 
                            : store.status === "INACTIVE" 
                            ? "bg-gray-100 text-gray-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {store.status === "ACTIVE" ? "Activa" : store.status === "INACTIVE" ? "Inactiva" : "Suspendida"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(store.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                          <Link 
                            href={`/dashboard-admin/stores/${store.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="w-5 h-5" />
                            <span className="sr-only">Ver</span>
                          </Link>
                          <Link 
                            href={`/dashboard-admin/stores/${store.id}/edit`}
                            className="text-amber-600 hover:text-amber-900"
                          >
                            <Edit className="w-5 h-5" />
                            <span className="sr-only">Editar</span>
                          </Link>
                          <button 
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="w-5 h-5" />
                            <span className="sr-only">Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 