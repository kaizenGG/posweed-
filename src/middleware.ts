import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  "/login",
  "/login-admin",
  "/api/auth/sign-in",
  "/api/auth/verify"
];

// Función para verificar si es una ruta pública
const isPublicRoute = (pathname: string) => {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
};

// Verificar si es una ruta de la API
const isApiRoute = (pathname: string) => {
  return pathname.startsWith('/api/');
};

// Función para verificar si la ruta pertenece al dashboard
const isDashboardRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard-admin');
};

// Función para verificar si la ruta pertenece al dashboard admin
const isAdminDashboardRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard-admin');
};

// Middleware que se ejecuta en cada request
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Permitir rutas públicas y APIs sin autenticación
  if (isPublicRoute(pathname) || isApiRoute(pathname)) {
    return NextResponse.next();
  }
  
  // Sólo revisar que exista alguna cookie de sesión (sin validarla)
  const hasSessionToken = request.cookies.has("session_token");
  const hasAuthToken = request.cookies.has("auth_token");
  
  // Si no hay token, redireccionar a login
  if (!hasSessionToken && !hasAuthToken) {
    console.log("[Middleware] No hay cookie de sesión para ruta:", pathname);
    
    // Redireccionar a login según el tipo de ruta
    if (pathname.startsWith("/dashboard-admin")) {
      return NextResponse.redirect(new URL("/login-admin", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  
  // Si hay token, permitir continuar - la verificación más profunda
  // se hará en los layouts de los dashboards
  return NextResponse.next();
}

// Configurar en qué rutas se ejecutará el middleware
export const config = {
  matcher: [
    // Rutas protegidas
    '/dashboard/:path*',
    '/dashboard-admin/:path*',
  ]
}; 