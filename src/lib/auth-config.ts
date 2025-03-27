import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  debug: true, // Activar modo debug para ver logs detallados
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        storeId: { label: "Store ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        console.log("Authorize llamado con credenciales:", credentials ? "Sí" : "No");
        
        if (!credentials?.storeId || !credentials?.password) {
          console.log("Credenciales incompletas");
          throw new Error("Por favor ingrese su ID de tienda y contraseña");
        }

        try {
          // Buscar la tienda
          const store = await prisma.store.findUnique({
            where: {
              id: credentials.storeId
            },
            include: {
              user: true
            }
          });

          if (!store) {
            console.log("Tienda no encontrada");
            throw new Error("ID de tienda o contraseña incorrecta");
          }

          // Verificar contraseña
          const isValid = await bcrypt.compare(
            credentials.password,
            store.hashedPassword || ""
          );

          if (!isValid) {
            console.log("Contraseña incorrecta");
            throw new Error("ID de tienda o contraseña incorrecta");
          }

          console.log("Autenticación exitosa");
          
          // Si el store tiene usuario asociado, usar esos datos
          if (store.user) {
            return {
              id: store.user.id,
              email: store.user.email,
              name: store.user.name || store.name,
              role: store.user.role
            };
          }
          
          // Si no hay usuario asociado, usar datos de la tienda
          return {
            id: store.id,
            email: store.email || "",
            name: store.name,
            role: "STORE" as UserRole
          };
        } catch (error) {
          console.error("Error en authorize:", error);
          throw new Error("Error al autenticar. Por favor, inténtelo de nuevo.");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    }
  }
}; 