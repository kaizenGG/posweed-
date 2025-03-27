import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Añadir logs para depuración
console.log("Cargando configuración de NextAuth...")
console.log("Database URL configurada:", process.env.DATABASE_URL ? "Sí" : "No")
console.log("NEXTAUTH_SECRET configurado:", process.env.NEXTAUTH_SECRET ? "Sí" : "No")
console.log("NEXTAUTH_URL configurado:", process.env.NEXTAUTH_URL ? "Sí" : "No")

// Modificar las opciones para forzar cookies más robustas
const modifiedOptions = {
  ...authOptions,
  cookies: {
    ...authOptions.cookies,
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 // 30 días
      }
    }
  }
};

// Usar las opciones modificadas
const handler = NextAuth(modifiedOptions)

// Exportar directamente los handlers
export { handler as GET, handler as POST } 