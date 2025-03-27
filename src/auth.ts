import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "./lib/auth-options";
import { UserRole } from "@prisma/client";

// Función para obtener la sesión en el servidor
export async function getSession() {
  return await getServerSession(authOptions);
}

// Función para obtener autenticación
export async function getAuth() {
  const session = await getSession();
  return session;
}

// Función para verificar que el usuario tenga permisos de administrador
export async function requireAdmin() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login-admin");
  }
  
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/login-admin?error=access_denied");
  }
  
  return session;
}

// Función para verificar que el usuario sea una tienda
export async function requireStore() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/login");
  }
  
  if (session.user.role !== UserRole.STORE) {
    redirect("/login?error=access_denied");
  }
  
  return session;
}

export { authOptions }; 