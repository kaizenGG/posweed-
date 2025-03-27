import Link from "next/link";
import { Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 text-center">
          <h1 className="text-3xl font-bold text-white">PosWeed</h1>
          <p className="mt-2 text-indigo-100">Sistema de Punto de Venta</p>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600">
              Bienvenido al sistema de punto de venta. Seleccione una opción para continuar.
            </p>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/login-admin" 
              className="flex items-center justify-center w-full px-4 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Shield className="w-5 h-5 mr-2" />
              Acceso Administrativo
            </Link>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>
            
            <div className="bg-gray-100 rounded-md p-4 text-center">
              <p className="text-sm text-gray-600">
                El acceso a tiendas estará disponible pronto.
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} PosWeed. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
