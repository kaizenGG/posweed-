import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Añadir logs para depuración
console.log("Cargando configuración de NextAuth...")
console.log("Database URL configurada:", process.env.DATABASE_URL ? "Sí" : "No")
console.log("NEXTAUTH_SECRET configurado:", process.env.NEXTAUTH_SECRET ? "Sí" : "No")
console.log("NEXTAUTH_URL configurado:", process.env.NEXTAUTH_URL ? "Sí" : "No")

const handler = NextAuth(authOptions)

// Exportar directamente los handlers
export { handler as GET, handler as POST } 