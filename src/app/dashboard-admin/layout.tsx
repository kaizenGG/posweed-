"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  User, 
  Home, 
  Store, 
  ShoppingBag, 
  Users, 
  LogOut, 
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";

interface AdminData {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    const verifyAdminSession = async () => {
      try {
        setIsLoading(true);
        console.log("Verificando sesión de administrador...");
        
        // Función mejorada para obtener cookies
        function getCookie(name: string) {
          // Intentar desde document.cookie
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift();
            console.log(`Cookie ${name} encontrada:`, 
              cookieValue ? `${cookieValue.substring(0, 10)}...` : "no value");
            return cookieValue;
          }
          
          console.log(`Cookie ${name} no encontrada`);
          return null;
        }
        
        // Buscar token en múltiples fuentes
        let token = getCookie("session_token") || 
                    getCookie("auth_token") || 
                    getCookie("next-auth.session-token") ||
                    getCookie("__Secure-next-auth.session-token");
                    
        // Si no se encuentra en cookies, buscar en localStorage
        if (!token) {
          try {
            token = localStorage.getItem("session_token");
            if (token) {
              console.log("Token recuperado de localStorage");
              // Si se encuentra en localStorage, recrear la cookie
              document.cookie = `session_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              console.log("Cookies recreadas desde localStorage");
            }
          } catch (storageError) {
            console.warn("Error al acceder a localStorage:", storageError);
          }
        }
        
        if (!token) {
          console.log("No se encontró token de sesión, redirigiendo a login");
          router.push("/login-admin");
          return;
        }
        
        console.log("Token encontrado, verificando con la API...");
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          console.log("Error al verificar token:", data.message);
          document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          localStorage.removeItem("session_token");
          router.push("/login-admin");
          return;
        }
        
        // Verificar si el usuario es administrador
        const { user } = data;
        if (user.role !== "ADMIN") {
          console.log("Usuario no es administrador:", user.role);
          document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          localStorage.removeItem("session_token");
          router.push("/login-admin?error=unauthorized");
          return;
        }
        
        // Asegurarse de que las cookies estén establecidas correctamente
        document.cookie = `session_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        localStorage.setItem("session_token", token);
        
        console.log("Sesión de administrador verificada");
        setAdminData(user);
      } catch (error) {
        console.error("Error al verificar sesión:", error);
        router.push("/login-admin?error=session_error");
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyAdminSession();
  }, [router, pathname]);
  
  // Si está cargando, mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }
  
  // Si no hay datos de administrador y ya terminó de cargar, significa que hay un problema de autenticación
  if (!adminData && !isLoading) {
    return null; // No renderizar nada, se redirigirá en el useEffect
  }
  
  // Enlaces de navegación
  const navLinks = [
    {
      name: "Dashboard",
      href: "/dashboard-admin",
      icon: <Home className="w-5 h-5" />,
      active: pathname === "/dashboard-admin",
    },
    {
      name: "Tiendas",
      href: "/dashboard-admin/stores",
      icon: <Store className="w-5 h-5" />,
      active: pathname.includes("/dashboard-admin/stores"),
    },
    {
      name: "Productos",
      href: "/dashboard-admin/products",
      icon: <ShoppingBag className="w-5 h-5" />,
      active: pathname.includes("/dashboard-admin/products"),
    },
    {
      name: "Usuarios",
      href: "/dashboard-admin/users",
      icon: <Users className="w-5 h-5" />,
      active: pathname.includes("/dashboard-admin/users"),
    },
  ];
  
  const handleLogout = () => {
    // Eliminar cookies y localStorage
    document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem("session_token");
    router.push("/login-admin");
  };
  
  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-indigo-700">PosWeed Admin</h1>
        </div>
        
        {/* Navegación */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center px-4 py-3 rounded-md hover:bg-indigo-50 ${
                    link.active ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                  }`}
                >
                  <span className="mr-3">{link.icon}</span>
                  <span>{link.name}</span>
                  {link.active && <ChevronRight className="ml-auto w-4 h-4" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Perfil en sidebar */}
        <div className="p-4 border-t">
          <div className="flex items-center">
            <div className="bg-indigo-100 rounded-full p-2">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{adminData?.name || "Administrador"}</p>
              <p className="text-xs text-gray-500">{adminData?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </div>
      
      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Barra superior para móvil */}
        <header className="bg-white shadow md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-600 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <h1 className="ml-3 text-lg font-semibold text-indigo-700">PosWeed Admin</h1>
            </div>
            
            {/* Menú desplegable para móvil */}
            <div className="relative">
              <button className="flex items-center text-gray-700 focus:outline-none">
                <User className="w-5 h-5" />
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              {/* Dropdown opciones perfil (ejemplo) */}
            </div>
          </div>
          
          {/* Navegación móvil */}
          {isMobileMenuOpen && (
            <nav className="px-2 py-3 bg-white border-t">
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center px-4 py-2 rounded-md ${
                        link.active ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="mr-3">{link.icon}</span>
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2 text-red-600 rounded-md"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span>Cerrar Sesión</span>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </header>
        
        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 