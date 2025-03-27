import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

const handler = NextAuth(authOptions)

// Exportar directamente los handlers
export { handler as GET, handler as POST } 