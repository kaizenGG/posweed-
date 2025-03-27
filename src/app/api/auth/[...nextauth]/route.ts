import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Añadir logs para depuración
console.log("Cargando configuración de NextAuth...")
console.log("NEXTAUTH_URL configurado:", process.env.NEXTAUTH_URL ? "Sí" : "No")
console.log("NODE_ENV:", process.env.NODE_ENV)

// Forzar configuración óptima para cookies en producción
const modifiedOptions = {
  ...authOptions,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined, // Para producción en Vercel
        maxAge: 30 * 24 * 60 * 60 // 30 días
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax" as "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".vercel.app" : undefined
      }
    }
  },
  // Aumentar el debug para obtener más información
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code: string, ...message: any[]) {
      console.error(`[NextAuth][Error]: ${code}`, ...message)
    },
    warn(code: string, ...message: any[]) {
      console.warn(`[NextAuth][Warning]: ${code}`, ...message)
    },
    debug(code: string, ...message: any[]) {
      console.log(`[NextAuth][Debug]: ${code}`, ...message)
    }
  }
};

// Usar las opciones modificadas
const handler = NextAuth(modifiedOptions)

// Exportar directamente los handlers
export { handler as GET, handler as POST } 