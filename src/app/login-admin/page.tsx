"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [debug, setDebug] = useState<any>({});
  const router = useRouter();
  
  // Verificar si ya hay una sesión activa al cargar la página
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        console.log("🔍 [ADMIN-LOGIN] Verificando si ya existe una sesión activa...");
        
        // Obtener el token de las cookies o localStorage
        const token = localStorage.getItem("session_token") || 
                     document.cookie.split('; ').find(row => row.startsWith('session_token='))?.split('=')[1];
        
        if (token) {
          // Verificar el token con el servidor
          const response = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
            console.log("✅ [ADMIN-LOGIN] Sesión activa detectada, redirigiendo al dashboard...");
            router.replace("/dashboard-admin");
            return;
          } else {
            console.log("❌ [ADMIN-LOGIN] Token existente, pero inválido:", data.message);
            // Limpiar token inválido
            localStorage.removeItem("session_token");
            document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        } else {
          console.log("📝 [ADMIN-LOGIN] No se encontró sesión activa, mostrando formulario de login");
        }
      } catch (error) {
        console.error("💥 [ADMIN-LOGIN] Error al verificar la sesión:", error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkExistingSession();
  }, [router]);
  
  // Función para verificar la configuración y mostrar información de depuración
  useEffect(() => {
    async function checkConfig() {
      try {
        // Verificar la configuración de NextAuth
        const response = await fetch("/api/auth/auth-debug");
        const data = await response.json();
        setDebug(data);
        console.log("🔍 [DEBUG-ADMIN] Configuración de autenticación:", data);
      } catch (err) {
        console.error("🔴 [DEBUG-ADMIN] Error al verificar configuración:", err);
        setDebug({error: String(err)});
      }
    }
    
    checkConfig();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Limpiar email para evitar espacios
    const cleanEmail = email.trim();
    
    console.log("👑 [ADMIN-LOGIN] Intentando login para administrador:", cleanEmail);
    console.log("📋 [ADMIN-LOGIN] Longitud de contraseña:", password.length);
    
    try {
      // Intento de inicio de sesión con NextAuth
      const authResult = await signIn("credentials", {
        redirect: false,
        username: cleanEmail, // Usar email como username para credenciales
        password
      });
      
      console.log("🔄 [ADMIN-LOGIN] Resultado de login NextAuth:", 
        authResult ? `OK: ${authResult.ok}, Error: ${authResult.error || 'ninguno'}` : "No hay resultado");
      
      if (authResult?.error) {
        setError(authResult.error);
        console.error("❌ [ADMIN-LOGIN] Error en login:", authResult.error);
      } else if (authResult?.ok) {
        console.log("✅ [ADMIN-LOGIN] Login exitoso, redirigiendo al dashboard admin...");
        
        // Esperar un momento antes de redirigir para asegurar que la sesión se establezca
        setTimeout(() => {
          try {
            // Usar push con revalidación completa para forzar recarga de datos
            router.push('/dashboard-admin');
            console.log("🚀 [ADMIN-LOGIN] Redirección iniciada con router.push");
            
            // Como respaldo, también intentamos con location.href
            setTimeout(() => {
              console.log("🔄 [ADMIN-LOGIN] Aplicando redirección de respaldo");
              window.location.href = '/dashboard-admin';
            }, 1000);
          } catch (routerError) {
            console.error("❌ [ADMIN-LOGIN] Error en redirección con router:", routerError);
            // Si hay error con el router, usar directamente location
            window.location.href = '/dashboard-admin';
          }
        }, 500);
      }
    } catch (err) {
      console.error("💥 [ADMIN-LOGIN] Error inesperado en login:", err);
      setError("Ocurrió un error inesperado. Por favor intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mostrar spinner mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex justify-center">
            <Image
              src="/assets/logo.png"
              alt="PosWeed Logo"
              width={120}
              height={120}
              className="h-auto"
            />
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Iniciar sesión como Administrador
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}
          
          {/* Panel de depuración (visible siempre durante pruebas) */}
          <div className="mb-4 rounded border border-blue-400 bg-blue-50 p-3 text-blue-700 text-xs">
            <h3 className="font-bold">Información de depuración:</h3>
            <p>Para iniciar sesión como administrador, usa tu email completo y contraseña.</p>
            <p className="mt-1">Si tienes problemas, verifica la consola del navegador.</p>
          </div>
          
          <div className="mt-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                >
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </div>
            </form>
            
            <div className="mt-8">
              <div className="text-center text-sm text-gray-500">
                <p>
                  ¿Eres una tienda?{" "}
                  <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Iniciar sesión como tienda
                  </Link>
                </p>
              </div>
              
              <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
                <p>Datos de prueba:</p>
                <p className="mt-1">Email: admin@posweed.com</p>
                <p>Contraseña: Admin123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hidden lg:block relative w-0 flex-1 bg-gradient-to-br from-indigo-600 to-purple-600">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white">
          <h2 className="text-4xl font-bold mb-4">Panel de Administración</h2>
          <p className="text-xl max-w-md text-center">
            Acceda al panel de administración para gestionar tiendas, productos y usuarios.
          </p>
        </div>
      </div>
    </div>
  );
} 