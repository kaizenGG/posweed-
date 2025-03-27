import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  debug: true, // Activar modo debug para ver logs detallados
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },
  pages: {
    signIn: "/login", // Cambiar a la ruta real
    error: "/login", // Cambiar a la ruta real
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        console.log("Authorize llamado con credenciales:", credentials ? JSON.stringify({
          username: credentials.username,
          passwordLength: credentials.password?.length || 0
        }) : "No");
        
        if (!credentials?.username || !credentials?.password) {
          console.log("Credenciales incompletas");
          throw new Error("Por favor ingrese su usuario y contraseña");
        }

        try {
          console.log(`Intentando autenticar a: ${credentials.username}`);
          
          // CASO 1: Autenticación de administrador por email
          if (credentials.username.includes("@")) {
            console.log("Intentando autenticación por email (administrador)");
            const user = await prisma.user.findFirst({
              where: {
                email: credentials.username
              }
            });
            
            if (!user || !user.hashedPassword) {
              console.log("Usuario no encontrado o sin contraseña");
              throw new Error("Usuario o contraseña incorrectos");
            }
            
            const isValid = await bcrypt.compare(
              credentials.password,
              user.hashedPassword
            );
            
            if (!isValid) {
              console.log("Contraseña de usuario incorrecta");
              throw new Error("Usuario o contraseña incorrectos");
            }
            
            console.log("Autenticación de usuario exitosa:", user.role);
            return {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role
            };
          }
          
          // CASO 2: Autenticación de tienda por username
          console.log("Intentando autenticación por username (tienda)");
          const store = await prisma.store.findFirst({
            where: {
              username: credentials.username
            },
            include: {
              user: true
            }
          });
          
          if (!store) {
            console.log("Tienda no encontrada para username:", credentials.username);
            throw new Error("Usuario o contraseña incorrectos");
          }
          
          // Verificar contraseña de la tienda
          const isValid = await bcrypt.compare(
            credentials.password,
            store.hashedPassword || ""
          );
          
          if (!isValid) {
            console.log("Contraseña de tienda incorrecta");
            throw new Error("Usuario o contraseña incorrectos");
          }
          
          console.log("Autenticación de tienda exitosa:", store.id);
          
          // Si la tienda tiene usuario asociado, usar esa información
          if (store.user) {
            console.log("Usando datos del usuario asociado a la tienda:", store.user.id);
            return {
              id: store.user.id,
              email: store.user.email,
              name: store.name,
              role: store.user.role,
              storeId: store.id // Añadir storeId para identificar mejor
            };
          }
          
          // Si no hay usuario, crear uno básico con los datos de la tienda
          console.log("Usando datos directos de la tienda (sin usuario asociado)");
          return {
            id: store.id,
            email: store.email || `${store.username}@posweed.com`,
            name: store.name,
            role: "STORE" as UserRole,
            storeId: store.id
          };
        } catch (error) {
          console.error("Error en authorize:", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        // Añadir storeId si existe
        if ('storeId' in user) {
          token.storeId = user.storeId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        // Añadir storeId a la sesión si existe
        if ('storeId' in token) {
          session.user.storeId = token.storeId as string;
        }
      }
      return session;
    }
  }
}; 