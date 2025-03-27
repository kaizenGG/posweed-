import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { User } from "next-auth";

// Definir tipo para los datos de usuario extendidos que usamos en la autenticación
interface ExtendedUser extends User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image?: string | null;
  storeId?: string;
  storeName?: string;
  storeUsername?: string;
}

export const authOptions: NextAuthOptions = {
  debug: true, // Activar modo debug para ver logs detallados
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días para mayor persistencia
  },
  pages: {
    signIn: "/login", // Cambiar a la ruta real
    error: "/login", // Cambiar a la ruta real
    signOut: "/login", // Asegurarse de tener una página de cierre de sesión
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        console.log("🔐 [AUTH] Authorize llamado con credenciales:", credentials ? JSON.stringify({
          username: credentials.username,
          passwordLength: credentials.password?.length || 0
        }) : "No");
        
        if (!credentials?.username || !credentials?.password) {
          console.log("❌ [AUTH] Credenciales incompletas");
          throw new Error("Por favor ingrese su usuario y contraseña");
        }
        
        // Intentar determinar si es un login de administrador o de tienda
        const isEmail = credentials.username.includes('@');
        
        if (isEmail) {
          try {
            // Caso de login de administrador (por email)
            console.log("👑 [AUTH] Intentando login de administrador");
            const admin = await prisma.user.findUnique({
              where: { email: credentials.username },
              select: {
                id: true,
                email: true,
                name: true,
                hashedPassword: true,
                role: true,
                image: true
              }
            });
            
            if (!admin || !admin.hashedPassword) {
              console.log("❌ [AUTH] Administrador no encontrado o sin contraseña");
              throw new Error("Credenciales inválidas");
            }
            
            const isValidPassword = await bcrypt.compare(
              credentials.password,
              admin.hashedPassword
            );
            
            if (!isValidPassword) {
              console.log("❌ [AUTH] Contraseña incorrecta para administrador");
              throw new Error("Credenciales inválidas");
            }
            
            console.log("✅ [AUTH] Login de administrador exitoso:", admin.email);
            return {
              id: admin.id,
              email: admin.email,
              name: admin.name || admin.email.split('@')[0], // Asegurar nombre no nulo
              role: admin.role,
              image: admin.image
            } as ExtendedUser;
          } catch (error) {
            console.error("💥 [AUTH] Error en login de administrador:", error);
            throw new Error("Error al verificar credenciales de administrador");
          }
        } else {
          try {
            // Caso de login de tienda (por username)
            console.log("🏪 [AUTH] Intentando login de tienda");
            const store = await prisma.store.findUnique({
              where: { username: credentials.username },
              select: {
                id: true,
                name: true,
                username: true,
                hashedPassword: true, 
                status: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true
                  }
                }
              }
            });
            
            if (!store || !store.hashedPassword) {
              console.log("❌ [AUTH] Tienda no encontrada o sin contraseña");
              throw new Error("Credenciales inválidas");
            }
            
            if (store.status !== "ACTIVE") {
              console.log("❌ [AUTH] Tienda no activa:", store.status);
              throw new Error("Esta tienda no está activa");
            }
            
            const isValidPassword = await bcrypt.compare(
              credentials.password,
              store.hashedPassword
            );
            
            if (!isValidPassword) {
              console.log("❌ [AUTH] Contraseña incorrecta para tienda");
              throw new Error("Credenciales inválidas");
            }
            
            console.log("✅ [AUTH] Login de tienda exitoso:", store.username);
            return {
              id: store.user.id,
              name: store.user.name || store.name, // Asegurar nombre no nulo
              email: store.user.email,
              role: store.user.role,
              image: store.user.image,
              storeId: store.id,
              storeName: store.name,
              storeUsername: store.username
            } as ExtendedUser;
          } catch (error) {
            console.error("💥 [AUTH] Error en login de tienda:", error);
            throw new Error("Error al verificar credenciales de tienda");
          }
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("🔄 [AUTH] Generando JWT", user ? "con usuario nuevo" : "actualizando existente");
      
      // Si hay un nuevo login, actualizar el token con todos los datos del usuario
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.name = extendedUser.name || ''; // Evitar asignar null
        token.email = extendedUser.email;
        token.role = extendedUser.role;
        
        // Añadir datos de tienda si existen
        if ('storeId' in extendedUser && extendedUser.storeId) {
          token.storeId = extendedUser.storeId;
          token.storeName = extendedUser.storeName;
          token.storeUsername = extendedUser.storeUsername;
          console.log("🏪 [AUTH] Añadiendo datos de tienda al token:", extendedUser.storeName);
        }
        
        // Añadir timestamp para verificar expiración manualmente si es necesario
        token.createdAt = Date.now();
      }
      
      console.log("📦 [AUTH] JWT generado:", JSON.stringify({
        id: token.id,
        role: token.role,
        storeId: token.storeId || 'N/A'
      }));
      
      return token;
    },
    
    async session({ session, token }) {
      console.log("🔄 [AUTH] Actualizando sesión con datos del token");
      
      if (token && session.user) {
        // Copiar datos principales
        session.user.id = token.id as string;
        session.user.name = token.name as string || ''; // Evitar asignar null
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        
        // Añadir datos de tienda si existen
        if ('storeId' in token && token.storeId) {
          session.user.storeId = token.storeId as string;
          session.user.storeName = token.storeName as string;
          session.user.storeUsername = token.storeUsername as string;
          console.log("🏪 [AUTH] Añadiendo datos de tienda a la sesión:", token.storeName);
        }
      }
      
      console.log("📦 [AUTH] Sesión actualizada:", JSON.stringify({
        id: session.user.id,
        role: session.user.role,
        storeId: session.user.storeId || 'N/A'
      }));
      
      return session;
    }
  },
  // Asegurar que las cookies se configuran correctamente en producción
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 // 30 días
      }
    }
  }
}; 