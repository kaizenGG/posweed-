import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import { compare } from "bcrypt";

export const authOptions: NextAuthOptions = {
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

          // Buscar primero en stores por username
          const store = await prisma.store.findUnique({
            where: {
              username: credentials.username
            },
            select: {
              id: true,
              userId: true,
              hashedPassword: true
            }
          });

          // Si existe la tienda, buscar el usuario asociado
          if (store) {
            console.log("[Auth] Tienda encontrada con id:", store.id);
            
            // Verificar contraseña de la tienda
            if (store.hashedPassword) {
              const isPasswordValid = await compare(credentials.password, store.hashedPassword);
              
              if (!isPasswordValid) {
                console.log("[Auth] Contraseña de tienda inválida");
                return null;
              }
              
              // Obtener datos del usuario asociado
              const user = await prisma.user.findUnique({
                where: { id: store.userId }
              });
              
              if (!user) {
                console.log("[Auth] Usuario de tienda no encontrado");
                return null;
              }
              
              return {
                id: user.id,
                email: user.email,
                name: user.name || "",
                role: user.role
              };
            }
          } 
          
          // Si no se encontró tienda, buscar usuario directamente
          const user = await prisma.user.findFirst({
            where: {
              email: credentials.username
            }
          });
          
          if (!user || !user.hashedPassword) {
            console.log("[Auth] Usuario no encontrado o sin contraseña");
            return null;
          }
          
          // Verificar contraseña de usuario
          const isPasswordValid = await compare(credentials.password, user.hashedPassword);
          
          if (!isPasswordValid) {
            console.log("[Auth] Contraseña de usuario inválida");
            return null;
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
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === "development"
}; 