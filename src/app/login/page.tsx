"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState<any>({});
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verificar si ya hay una sesión activa al cargar la página
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        console.log("🔍 [TIENDA-LOGIN] Verificando si ya existe una sesión activa...");
        
        // Obtener el token de las cookies o localStorage
        const token = localStorage.getItem("session_token") || 
                     document.cookie.split('; ').find(row => row.startsWith('session_token='))?.split('=')[1] ||
                     document.cookie.split('; ').find(row => row.startsWith('next-auth.session-token='))?.split('=')[1] ||
                     document.cookie.split('; ').find(row => row.startsWith('__Secure-next-auth.session-token='))?.split('=')[1];
        
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
            console.log("✅ [TIENDA-LOGIN] Sesión activa detectada, redirigiendo al dashboard...");
            router.replace("/dashboard");
            return;
          } else {
            console.log("❌ [TIENDA-LOGIN] Token existente, pero inválido:", data.message);
            // Limpiar token inválido
            localStorage.removeItem("session_token");
            document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          }
        } else {
          console.log("📝 [TIENDA-LOGIN] No se encontró sesión activa, mostrando formulario de login");
        }
      } catch (error) {
        console.error("💥 [TIENDA-LOGIN] Error al verificar la sesión:", error);
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
        console.log("🔍 [DEBUG-TIENDA] Configuración de autenticación:", data);
      } catch (err) {
        console.error("🔴 [DEBUG-TIENDA] Error al verificar configuración:", err);
        setDebug({error: String(err)});
      }
    }
    
    checkConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Aseguramos que el username no tenga espacios extras
    const cleanUsername = username.trim();
    
    console.log("🏪 [LOGIN-TIENDA] Intentando login para tienda:", cleanUsername);
    console.log("📋 [LOGIN-TIENDA] Longitud de contraseña:", password.length);
    
    try {
      // Limpiar cualquier cookie existente primero para evitar conflictos
      document.cookie = "session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("session_token");
      
      // Intento de inicio de sesión con signIn de NextAuth
      const authResult = await signIn("credentials", {
        redirect: false,
        username: cleanUsername, // Nombre de usuario de la tienda limpio
        password
      });
      
      console.log("🔄 [LOGIN-TIENDA] Resultado de login NextAuth:", 
        authResult ? `OK: ${authResult.ok}, Error: ${authResult.error || 'ninguno'}` : "No hay resultado");
      
      if (authResult?.error) {
        setError(authResult.error);
        console.error("❌ [LOGIN-TIENDA] Error en login:", authResult.error);
      } else if (authResult?.ok) {
        console.log("✅ [LOGIN-TIENDA] Login exitoso, redirigiendo al dashboard...");
        
        // Usar el método de API fetch para obtener un token personalizado
        try {
          const apiResponse = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              username: cleanUsername,
              password: password
            }),
          });
          
          if (apiResponse.ok) {
            const data = await apiResponse.json();
            if (data.token) {
              // Guardar el token en localStorage y cookies manualmente
              localStorage.setItem("session_token", data.token);
              document.cookie = `session_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              console.log("🔑 [LOGIN-TIENDA] Token personalizado guardado");
            }
          }
        } catch (apiError) {
          console.error("❌ [LOGIN-TIENDA] Error al obtener token personalizado:", apiError);
        }
        
        // Manualmente establecer cookies para asegurar que estén presentes
        const setSessionCookie = () => {
          try {
            // Intentar obtener el token de múltiples fuentes
            let token = localStorage.getItem("session_token");
            
            if (!token) {
              // Buscar en las cookies de NextAuth
              const nextAuthCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('next-auth.session-token=') || 
                             row.startsWith('__Secure-next-auth.session-token='));
              
              if (nextAuthCookie) {
                token = nextAuthCookie.split('=')[1];
              }
            }
            
            if (token) {
              // Crear cookies personalizadas con el token
              document.cookie = `session_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
              localStorage.setItem("session_token", token);
              console.log("🍪 [LOGIN-TIENDA] Cookies personalizadas establecidas manualmente");
              return true;
            }
            return false;
          } catch (e) {
            console.error("❌ [LOGIN-TIENDA] Error al establecer cookies:", e);
            return false;
          }
        };
        
        // Intentar establecer cookies y esperar un momento antes de redirigir
        setSessionCookie();
        
        // Redirigir después de un pequeño retraso para permitir que las cookies se establezcan
        setTimeout(() => {
          try {
            // Intentar establecer cookies nuevamente como segunda verificación
            setSessionCookie();
            
            console.log("🔄 [LOGIN-TIENDA] Verificando cookies antes de redirigir:");
            console.log(document.cookie);
            
            // Usar push con revalidación completa para forzar recarga de datos
            router.push('/dashboard');
            console.log("🚀 [LOGIN-TIENDA] Redirección iniciada con router.push");
            
            // Como respaldo, también intentamos con location.href después de un breve retraso
            setTimeout(() => {
              if (setSessionCookie()) {
                console.log("🔄 [LOGIN-TIENDA] Aplicando redirección de respaldo");
                window.location.href = '/dashboard';
              }
            }, 1000);
          } catch (routerError) {
            console.error("❌ [LOGIN-TIENDA] Error en redirección con router:", routerError);
            // Si hay error con el router, usar directamente location
            window.location.href = '/dashboard';
          }
        }, 1000);
      }
    } catch (err) {
      console.error("💥 [LOGIN-TIENDA] Error inesperado en login:", err);
      setError("Ocurrió un error inesperado. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Mostrar spinner mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/logo.png"
              alt="PosWeed Logo"
              width={120}
              height={120}
              className="h-auto"
              unoptimized
            />
          </div>
          
          <h1 className="mb-6 text-center text-2xl font-bold text-green-600">Iniciar Sesión como Tienda</h1>
          
          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}
          
          {/* Panel de depuración (visible siempre durante pruebas) */}
          <div className="mb-4 rounded border border-blue-400 bg-blue-50 p-3 text-blue-700 text-xs">
            <h3 className="font-bold">Información de depuración:</h3>
            <p>Para iniciar sesión como tienda, usa el nombre de tienda exacto y la contraseña configurada.</p>
            <p className="mt-1">Si tienes problemas, verifica la consola del navegador.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                Nombre de usuario de la tienda
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-4">
              <button
                type="submit"
                className={`w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
              
              <div className="text-center text-sm text-gray-600">
                ¿Eres administrador? <Link href="/login-admin" className="text-green-600 hover:underline">Inicia sesión aquí</Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 