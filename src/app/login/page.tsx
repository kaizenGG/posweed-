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
    console.log("🔍 [LOGIN] Verificando si ya existe una sesión activa...");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    console.log("[Cliente] Intentando login para:", username);
    
    try {
      // Intento de inicio de sesión con signIn de NextAuth
      const authResult = await signIn("credentials", {
        redirect: false,
        username,
        password
      });
      
      console.log("[Cliente] Resultado de login NextAuth:", authResult);
      
      if (authResult?.error) {
        setError(authResult.error);
        console.error("[Cliente] Error en login:", authResult.error);
      } else if (authResult?.ok) {
        console.log("[Cliente] Login exitoso, redirigiendo...");
        router.push('/dashboard');
      }
    } catch (err) {
      console.error("[Cliente] Error inesperado en login:", err);
      setError("Ocurrió un error inesperado. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

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
            />
          </div>
          
          <h1 className="mb-6 text-center text-2xl font-bold text-green-600">Iniciar Sesión como Tienda</h1>
          
          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
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
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                Nombre de usuario o Email
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
              
              <div className="text-center text-xs text-gray-500 mt-4">
                <p>Para iniciar sesión como tienda, utiliza:</p>
                <p>Usuario: [nombredetienda]</p>
                <p>Contraseña: [contraseña de tienda]</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 