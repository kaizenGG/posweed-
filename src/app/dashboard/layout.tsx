"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BarChart4,
  Package,
  Users,
  ShoppingCart,
  LogOut,
  TagIcon,
  ShoppingBag,
  Receipt,
  Boxes,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { signOut } from "next-auth/react";

// Contexto para gestionar el estado de navegación
interface NavigationContextType {
  isNavigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  startNavigation: () => {},
  endNavigation: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<{
    name?: string, 
    storeName?: string,
    isAdminAccess?: boolean,
    adminName?: string
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Función para alternar la visibilidad del menú
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Función para colapsar/expandir el sidebar
  const toggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    
    // Guardar estado en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', newState ? 'true' : 'false');
    }
  };

  // Funciones de navegación
  const startNavigation = () => setIsNavigating(true);
  const endNavigation = () => setIsNavigating(false);

  // Función de navegación programática con efecto visual
  const navigateTo = (path: string) => {
    if (pathname === path) return;
    
    startNavigation();
    router.push(path);
    
    // En móvil, cerrar el sidebar al navegar
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Cargar estado del sidebar desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === 'true');
      }
    }
  }, []);

  // Detener la navegación cuando cambia la ruta
  useEffect(() => {
    endNavigation();
  }, [pathname]);

  // Verificar autenticación de manera sencilla
  useEffect(() => {
    // Función para verificar token
    const verifyAuth = async () => {
      try {
        // Buscar la cookie con más detalle y trazabilidad
        function getCookie(name: string) {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift();
            console.log(`[Cliente] Cookie ${name} encontrada:`, 
              cookieValue ? cookieValue.substring(0, 10) + "..." : "no value");
            return cookieValue;
          }
          console.log(`[Cliente] Cookie ${name} no encontrada en document.cookie`);
          return null;
        }

        // Obtener token de diferentes fuentes
        let cookieValue = getCookie("session_token");
        
        // Si no está en la cookie principal, intentar con la de respaldo
        if (!cookieValue) {
          cookieValue = getCookie("auth_token");
          if (cookieValue) {
            console.log("[Cliente] Usando cookie de respaldo auth_token");
          }
        }
        
        // Intentar con cookies de NextAuth directamente
        if (!cookieValue) {
          cookieValue = getCookie("next-auth.session-token") || getCookie("__Secure-next-auth.session-token");
          if (cookieValue) {
            console.log("[Cliente] Usando cookie original de NextAuth");
            // Recrear nuestras cookies personalizadas
            document.cookie = `session_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
            document.cookie = `auth_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
          }
        }
        
        // Si no está en las cookies, intentar con localStorage
        if (!cookieValue) {
          try {
            cookieValue = localStorage.getItem("session_token");
            if (cookieValue) {
              console.log("[Cliente] Token recuperado de localStorage");
              // Si se encuentra en localStorage, recrear la cookie
              document.cookie = `session_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              document.cookie = `auth_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              console.log("[Cliente] Cookie recreada desde localStorage");
            }
          } catch (storageError) {
            console.warn("[Cliente] Error al acceder a localStorage:", storageError);
          }
        }

        if (!cookieValue) {
          console.log("[Cliente] No hay token de sesión en ninguna fuente");
          window.location.href = '/login';
          return;
        }

        // Verificar el token con el servidor
        console.log("[Cliente] Enviando token al servidor para verificación");
        
        try {
          const response = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: cookieValue }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("[Cliente] Token inválido:", errorData.message);
            // Limpiar todas las formas de almacenamiento
            document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            try { localStorage.removeItem("session_token"); } catch (e) {}
            window.location.href = '/login';
            return;
          }

          const data = await response.json();
          
          // Extraer información detallada para diagnóstico
          console.log("[Cliente] Datos completos recibidos:", data);
          
          // Establecer nuevamente las cookies para mantenerlas actualizadas
          document.cookie = `session_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
          document.cookie = `auth_token=${cookieValue}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
          localStorage.setItem("session_token", cookieValue);
          
          // Verificar si hay datos de usuario y si tiene datos de tienda
          // No importa el rol, lo importante es que tenga los datos de la tienda
          if (!data || !data.user || !data.user.storeId) {
            console.error("[Cliente] Usuario no tiene datos de tienda necesarios", {
              hasUser: !!data?.user,
              role: data?.user?.role,
              storeId: data?.user?.storeId
            });
            
            // Limpiar todas las formas de almacenamiento
            document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            try { localStorage.removeItem("session_token"); } catch (e) {}
            window.location.href = '/login';
            return;
          }
          
          // Si todo está bien, configurar el estado con los datos del usuario
          setUserData({
            name: data.user.name || "Usuario",
            storeName: data.user.storeName || "Tienda",
            isAdminAccess: data.user.adminAccess === true,
            adminName: data.user.adminAccess === true ? data.user.name : undefined
          });
        } catch (error) {
          console.error("[Cliente] Error al verificar token:", error);
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        console.error("[Cliente] Error general al verificar autenticación:", error);
        window.location.href = '/login';
        return;
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [pathname]);

  // Función para cerrar sesión
  const handleSignOut = async () => {
    try {
      // Primero limpiamos cualquier dato local
      localStorage.removeItem('session');
      sessionStorage.clear();
      
      // Luego llamamos a signOut con las opciones correctas
      await signOut({
        callbackUrl: '/login',
        redirect: true
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const storeName = userData?.storeName || "Tienda";

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation, endNavigation }}>
      <div className="flex min-h-screen bg-gray-50 relative">
        {/* Indicador de navegación */}
        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-green-500 animate-pulse"></div>
        )}
        
        {/* Botón de menú móvil */}
        <button 
          onClick={toggleSidebar}
          className="fixed md:hidden z-50 top-4 left-4 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-md text-gray-700 hover:bg-gray-100 transition-all duration-300"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        {/* Overlay para cerrar el menú al hacer clic fuera (solo en móvil) */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:static
          ${isSidebarCollapsed ? 'w-14' : 'w-48'}
        `}>
          {/* Logo */}
          <div className="flex items-center justify-center h-12 border-b border-gray-200 relative">
            {isSidebarCollapsed ? (
              <div className="p-1">
                <svg width="28" height="28" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40 0C17.9086 0 0 17.9086 0 40C0 62.0914 17.9086 80 40 80C62.0914 80 80 62.0914 80 40C80 17.9086 62.0914 0 40 0Z" fill="#10B981"/>
                  <path d="M57 30C57 36.6274 51.6274 42 45 42C38.3726 42 33 36.6274 33 30C33 23.3726 38.3726 18 45 18C51.6274 18 57 23.3726 57 30Z" fill="#F3F4F6"/>
                  <path d="M27 50C27 55.5228 22.5228 60 17 60C11.4772 60 7 55.5228 7 50C7 44.4772 11.4772 40 17 40C22.5228 40 27 44.4772 27 50Z" fill="#F3F4F6"/>
                  <path d="M73 50C73 55.5228 68.5228 60 63 60C57.4772 60 53 55.5228 53 50C53 44.4772 57.4772 40 63 40C68.5228 40 73 44.4772 73 50Z" fill="#F3F4F6"/>
                  <path d="M47 55C47 60.5228 42.5228 65 37 65C31.4772 65 27 60.5228 27 55C27 49.4772 31.4772 45 37 45C42.5228 45 47 49.4772 47 55Z" fill="#F3F4F6"/>
                </svg>
              </div>
            ) : (
              <div className="flex items-center">
                <svg width="28" height="28" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M40 0C17.9086 0 0 17.9086 0 40C0 62.0914 17.9086 80 40 80C62.0914 80 80 62.0914 80 40C80 17.9086 62.0914 0 40 0Z" fill="#10B981"/>
                  <path d="M57 30C57 36.6274 51.6274 42 45 42C38.3726 42 33 36.6274 33 30C33 23.3726 38.3726 18 45 18C51.6274 18 57 23.3726 57 30Z" fill="#F3F4F6"/>
                  <path d="M27 50C27 55.5228 22.5228 60 17 60C11.4772 60 7 55.5228 7 50C7 44.4772 11.4772 40 17 40C22.5228 40 27 44.4772 27 50Z" fill="#F3F4F6"/>
                  <path d="M73 50C73 55.5228 68.5228 60 63 60C57.4772 60 53 55.5228 53 50C53 44.4772 57.4772 40 63 40C68.5228 40 73 44.4772 73 50Z" fill="#F3F4F6"/>
                  <path d="M47 55C47 60.5228 42.5228 65 37 65C31.4772 65 27 60.5228 27 55C27 49.4772 31.4772 45 37 45C42.5228 45 47 49.4772 47 55Z" fill="#F3F4F6"/>
                </svg>
                <span className="text-sm font-semibold text-green-600">PosWeed</span>
              </div>
            )}
            
            {/* Botón para colapsar/expandir en desktop */}
            <button 
              onClick={toggleSidebarCollapse}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 bg-white border border-gray-200 rounded-full p-0.5 shadow-sm hover:bg-gray-50"
              aria-label={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>

          {/* Navegación con prefetch */}
          <div className="flex-1 px-1.5 py-2 overflow-y-auto">
            <button 
              onClick={() => navigateTo('/dashboard')} 
              className={`
                flex items-center px-2 py-1.5 my-1 text-sm rounded-md w-full
                ${pathname === '/dashboard' 
                  ? 'bg-green-50 text-green-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <Home className={`
                ${isSidebarCollapsed ? 'mx-auto' : 'mr-2'} h-4 w-4
                ${pathname === '/dashboard' ? 'text-green-600' : 'text-gray-400'}
              `} />
              {!isSidebarCollapsed && <span className="text-xs">Home</span>}
            </button>
            
            <button 
              onClick={() => navigateTo('/dashboard/shop')}
              className={`
                flex items-center px-2 py-1.5 my-1 text-sm rounded-md w-full
                ${pathname.startsWith('/dashboard/shop') 
                  ? 'bg-green-50 text-green-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <ShoppingBag className={`
                ${isSidebarCollapsed ? 'mx-auto' : 'mr-2'} h-4 w-4
                ${pathname.startsWith('/dashboard/shop') ? 'text-green-600' : 'text-gray-400'}
              `} />
              {!isSidebarCollapsed && <span className="text-xs">Dashboard Shop</span>}
            </button>
            
            <div className="pt-2 mt-2 border-t border-gray-200">
              {!isSidebarCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</h3>
              )}
              <div className="mt-1 space-y-0.5">
                <button 
                  onClick={() => navigateTo('/dashboard/analytics')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.startsWith('/dashboard/analytics') 
                      ? 'bg-green-50 text-green-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <BarChart4 className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.startsWith('/dashboard/analytics') ? 'text-green-600' : 'text-gray-400'}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Analytics</span>}
                </button>
                
                <button 
                  onClick={() => navigateTo('/dashboard/products')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.startsWith('/dashboard/products') 
                      ? 'bg-green-50 text-green-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <Package className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.startsWith('/dashboard/products') ? 'text-green-600' : 'text-gray-400'}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Products</span>}
                </button>
                
                <button 
                  onClick={() => navigateTo('/dashboard/categories')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.startsWith('/dashboard/categories') 
                      ? 'bg-green-50 text-green-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <TagIcon className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.startsWith('/dashboard/categories') ? 'text-green-600' : 'text-gray-400'}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Categories</span>}
                </button>
                
                <button 
                  onClick={() => navigateTo('/dashboard/sales')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.startsWith('/dashboard/sales') 
                      ? 'bg-green-50 text-green-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <Receipt className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.startsWith('/dashboard/sales') ? 'text-green-600' : 'text-gray-400'}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Sales</span>}
                </button>
                
                <div className={`
                  flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-not-allowed opacity-70
                  ${isSidebarCollapsed ? 'justify-center' : ''}
                `}>
                  <Users className={`${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4 text-gray-400`} />
                  {!isSidebarCollapsed && <span className="text-xs">Customers</span>}
                </div>
                
                <button 
                  onClick={() => navigateTo('/dashboard/suppliers')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.startsWith('/dashboard/suppliers') 
                      ? 'bg-green-50 text-green-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <ShoppingCart className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.startsWith('/dashboard/suppliers') ? 'text-green-600' : 'text-gray-400'}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Suppliers</span>}
                </button>
              </div>
            </div>
            
            {/* Branch section */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              {!isSidebarCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</h3>
              )}
              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => navigateTo('/dashboard/inventory')}
                  className={`
                    flex items-center px-2 py-1.5 text-sm rounded-md w-full
                    ${pathname.includes("/dashboard/inventory")
                      ? "text-green-600 bg-green-50"
                      : "text-gray-700 hover:bg-gray-100"}
                    ${isSidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <Package className={`
                    ${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4
                    ${pathname.includes("/dashboard/inventory") ? "text-green-600" : "text-gray-400"}
                  `} />
                  {!isSidebarCollapsed && <span className="text-xs">Inventory</span>}
                </button>

                {/* El resto de los elementos de navegación con los mismos cambios... */}
              </div>
            </div>
          </div>
          
          {/* Usuario */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  {storeName.charAt(0)}
                </div>
                {!isSidebarCollapsed && (
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-700">{storeName}</p>
                    <p className="text-xs text-gray-500">Tienda</p>
                    {userData?.isAdminAccess && (
                      <p className="text-xs text-red-500 font-medium mt-0.5">
                        Modo Admin
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={handleSignOut}
                className="p-1 rounded-full text-gray-400 hover:text-gray-500"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Contenido principal */}
        <main className="flex-1">
          <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-14' : 'md:ml-48'} min-h-screen`}>
            {isNavigating ? (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500 overflow-hidden">
                <div className="progress-bar h-full w-full"></div>
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </NavigationContext.Provider>
  );
} 