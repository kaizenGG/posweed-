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
        console.log("🔍 [LOGIN-ADMIN] Verificando si ya existe una sesión activa...");
        
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
            console.log("✅ [LOGIN-ADMIN] Sesión activa detectada, redirigiendo al dashboard...");
            router.replace("/dashboard-admin");
            return;
          } else {
            console.log("❌ [LOGIN-ADMIN] Token existente, pero inválido:", data.message);
            // Limpiar token inválido
            localStorage.removeItem("session_token");
            document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        } else {
          console.log("📝 [LOGIN-ADMIN] No se encontró sesión activa, mostrando formulario de login");
        }
      } catch (error) {
        console.error("💥 [LOGIN-ADMIN] Error al verificar la sesión:", error);
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
        console.log("🔍 [DEBUG] Configuración de autenticación:", data);
      } catch (err) {
        console.error("🔴 [DEBUG] Error al verificar configuración:", err);
        setDebug({error: String(err)});
      }
    }
    
    checkConfig();
    
    // Logs adicionales
    console.log("🔍 [LOGIN-ADMIN] Verificando si ya existe una sesión activa...");
  }, []);
  
  // Función para establecer cookies de manera segura
  const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    // Importante: NO usar httpOnly aquí ya que estamos en el cliente
    document.cookie = name + "=" + value + expires + "; path=/; SameSite=Lax";
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!email || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    console.log("[Cliente Admin] Intentando login para administrador:", email);
    
    try {
      // Intento de inicio de sesión con NextAuth
      const authResult = await signIn("credentials", {
        redirect: false,
        username: email, // Usar email como username para credenciales
        password
      });
      
      console.log("[Cliente Admin] Resultado de login NextAuth:", authResult);
      
      if (authResult?.error) {
        setError(authResult.error);
        console.error("[Cliente Admin] Error en login:", authResult.error);
      } else if (authResult?.ok) {
        console.log("[Cliente Admin] Login exitoso, redirigiendo...");
        router.push('/dashboard-admin');
      }
    } catch (err) {
      console.error("[Cliente Admin] Error inesperado en login:", err);
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
          
          {/* Panel de depuración (visible solo en desarrollo) */}
          {process.env.NODE_ENV !== "production" && (
            <div className="mb-4 rounded border border-blue-400 bg-blue-50 p-3 text-blue-700 text-xs">
              <h3 className="font-bold">Información de depuración:</h3>
              <pre className="mt-2 overflow-auto">
                {JSON.stringify(debug, null, 2)}
              </pre>
            </div>
          )}
          
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