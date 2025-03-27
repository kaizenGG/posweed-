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
        console.log("Authorize llamado con credenciales:", credentials ? "Sí" : "No");
        
        if (!credentials?.username || !credentials?.password) {
          console.log("Credenciales incompletas");
          throw new Error("Por favor ingrese su usuario y contraseña");
        }

        try {
          console.log(`Intentando autenticar a: ${credentials.username}`);
          
          // Primero buscar usuario por email (para admin)
          let user = await prisma.user.findFirst({
            where: {
              email: credentials.username
            }
          });

          // Si no se encuentra, buscar tienda por username
          let store = null;
          if (!user) {
            store = await prisma.store.findFirst({
              where: {
                username: credentials.username
              },
              include: {
                user: true
              }
            });
            
            // Si tenemos tienda y tiene usuario, usar ese
            if (store?.user) {
              user = store.user;
              console.log("Usuario encontrado a través de tienda");
            }
          } else {
            console.log("Usuario encontrado directamente por email");
          }
          
          // Si no se encuentra ni usuario ni tienda
          if (!user && !store) {
            console.log("No se encontró ni usuario ni tienda");
            throw new Error("Usuario o contraseña incorrectos");
          }

          // Si tenemos un usuario, verificar contraseña del usuario
          if (user && user.hashedPassword) {
            const isValid = await bcrypt.compare(
              credentials.password,
              user.hashedPassword
            );

            if (!isValid) {
              console.log("Contraseña de usuario incorrecta");
              throw new Error("Usuario o contraseña incorrectos");
            }

            console.log("Autenticación de usuario exitosa");
            return {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split('@')[0],
              role: user.role
            };
          }
          
          // Si tenemos una tienda pero no usuario, verificar contraseña de tienda
          if (store && store.hashedPassword) {
            const isValid = await bcrypt.compare(
              credentials.password,
              store.hashedPassword
            );

            if (!isValid) {
              console.log("Contraseña de tienda incorrecta");
              throw new Error("Usuario o contraseña incorrectos");
            }

            console.log("Autenticación de tienda exitosa");
            return {
              id: store.id,
              email: store.email || store.username + "@posweed.com",
              name: store.name || store.username,
              role: "STORE" as UserRole
            };
          }
          
          // Si llegamos aquí, no hay forma de validar contraseña
          console.log("No se pudo validar contraseña");
          throw new Error("Usuario o contraseña incorrectos");
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    }
  }
}; 