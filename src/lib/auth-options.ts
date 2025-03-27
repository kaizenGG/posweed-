import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import prisma from "./prisma";
import { UserRole } from "@prisma/client";

// Extender el tipo de sesión para agregar propiedades de tienda
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      storeId?: string;
      storeName?: string;
      storeUsername?: string;
    };
  }
}

// Configuración de NextAuth
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login-admin",
    signOut: "/login-admin",
    error: "/login-admin",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as UserRole;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
        
        // Si el usuario tiene rol de tienda, obtener datos adicionales
        if (token.role === UserRole.STORE) {
          const store = await prisma.store.findFirst({
            where: { userId: token.id },
            select: { id: true, name: true, username: true }
          });
          
          if (store) {
            session.user.storeId = store.id;
            session.user.storeName = store.name;
            session.user.storeUsername = store.username;
          }
        }
      }
      return session;
    },
  },
}; 