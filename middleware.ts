import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/auth";
import { UserRole } from "@prisma/client";

export async function middleware(request: NextRequest) {
  const session = await getAuth();

  // Verificar si hay un usuario autenticado
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login-admin", request.url));
  }

  // Verificar si el usuario es administrador
  if (session.user.role !== UserRole.ADMIN) {
    return NextResponse.redirect(
      new URL("/login-admin?error=access_denied", request.url)
    );
  }

  // Si está todo correcto, continuar
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard-admin/:path*"],
}; 