"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError("Por favor ingrese usuario y contraseña");
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      // Probar primero con la API original
      const legacyResponse = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, loginAsStore: true })
      });
      
      const legacyData = await legacyResponse.json();
      
      if (legacyResponse.ok && legacyData.success) {
        // Si el login legacy funciona, establecer cookie y redirigir
        document.cookie = `session_token=${legacyData.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        localStorage.setItem("session_token", legacyData.token);
        
        router.push("/dashboard");
        return;
      }
      
      // Si falla el legacy, intentar con NextAuth
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false
      });
      
      if (result?.error) {
        setError(result.error || "Credenciales incorrectas");
        return;
      }
      
      router.push("/dashboard");
      router.refresh();
      
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex justify-center">
            <Store className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Iniciar sesión
          </h2>
          
          <div className="mt-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Nombre de usuario
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
                    className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </div>
                  ) : (
                    "Iniciar sesión"
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Credenciales de tienda</p>
              <p className="mt-1">Usuario: el nombre de usuario de tu tienda</p>
              <p>Contraseña: la contraseña asignada a tu tienda</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 