import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { compare } from "bcrypt";
import { sign } from "jsonwebtoken";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            console.log("[Auth] Credenciales faltantes");
            return null;
          }

          console.log("[Auth] Intentando login con:", credentials.username);

          // Buscar primero en stores por username
          const store = await prisma.store.findUnique({
            where: {
              username: credentials.username
            },
            select: {
              id: true,
              userId: true,
              hashedPassword: true,
              name: true
            }
          });

          // Si existe la tienda, buscar el usuario asociado
          let user = null;
          if (store) {
            console.log("[Auth] Tienda encontrada, buscando usuario asociado");
            user = await prisma.user.findUnique({
              where: {
                id: store.userId
              }
            });
          } else {
            // Intentar buscar directamente por email (como fallback)
            console.log("[Auth] Tienda no encontrada, buscando usuario por email");
            user = await prisma.user.findFirst({
              where: {
                email: credentials.username
              }
            });
          }

          if (!user) {
            console.log("[Auth] Usuario no encontrado:", credentials.username);
            return null;
          }

          console.log("[Auth] Usuario encontrado:", user.id);
          
          // Verificar la contraseña - para tiendas, usar la contraseña de la tienda
          let passwordField;
          if (store?.hashedPassword) {
            passwordField = store.hashedPassword;
          } else {
            passwordField = user.hashedPassword;
          }
          
          // Verificar que exista un hash de contraseña
          if (!passwordField) {
            console.log("[Auth] Sin contraseña hasheada");
            return null;
          }

          // Intentar comparar la contraseña
          let isPasswordValid;
          try {
            isPasswordValid = await compare(credentials.password, passwordField);
          } catch (error) {
            console.error("[Auth] Error al comparar contraseñas:", error);
            // En caso de error, fallar la autenticación
            isPasswordValid = false;
          }

          if (!isPasswordValid) {
            console.log("[Auth] Contraseña inválida para usuario:", credentials.username);
            return null;
          }

          console.log("[Auth] Login exitoso para:", user.name || user.email);
          
          // Generar un token JWT adicional para mantener compatibilidad con el sistema anterior
          const token = sign(
            { 
              id: user.id, 
              email: user.email,
              role: user.role,
              storeId: store?.id 
            },
            process.env.NEXTAUTH_SECRET || "fallback-secret",
            { expiresIn: "24h" }
          );
          
          // Establecer cookies adicionales para compatibilidad
          if (typeof window !== 'undefined') {
            document.cookie = `session_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
            localStorage.setItem("session_token", token);
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.name || "",
            role: user.role
          };
        } catch (error) {
          console.error("[Auth] Error en authorize:", error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  }
}; 