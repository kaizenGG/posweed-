import { auth as getAuth } from "@/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function isAuthenticated() {
  const session = await getAuth();
  return !!session?.user;
}

export async function isAdmin() {
  const session = await getAuth();
  return session?.user?.role === UserRole.ADMIN;
}

export async function requireAdmin() {
  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    redirect("/login?error=access_denied");
  }
}

export async function requireAuth() {
  const session = await getAuth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
} 