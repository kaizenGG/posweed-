import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/login-admin', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Rutas que son sólo para admin
  const isAdminDashboardRoute = pathname.startsWith('/dashboard-admin');
  
  // Rutas para tiendas (dashboard regular)
  const isDashboardRoute = pathname.startsWith('/dashboard') && !isAdminDashboardRoute;
  
  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Si es una ruta de API, permitir acceso (la validación se hace en los endpoints)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Obtener token de sesión
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Depuración para ver el token
  console.log(`Middleware: Ruta ${pathname}, Token:`, token ? JSON.stringify({
    id: token.id,
    role: token.role,
    storeId: token.storeId || 'N/A'
  }) : "No token");
  
  // Si no hay token y no es ruta pública, redirigir a login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // Si intenta acceder a dashboard-admin pero no es admin, redirigir a dashboard normal
  if (isAdminDashboardRoute && token.role !== 'ADMIN') {
    console.log('Acceso denegado: Intento de acceso a dashboard-admin por usuario no admin');
    
    // Si es una tienda, redirigir a dashboard de tienda
    if (token.role === 'STORE') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Si no es admin ni tienda, redirigir a página de login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si intenta acceder al dashboard de tienda pero no es tienda ni admin, redirigir a login
  if (isDashboardRoute && token.role !== 'STORE' && token.role !== 'ADMIN') {
    console.log('Acceso denegado: Intento de acceso a dashboard por usuario que no es admin ni tienda');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Permitir acceso para todos los demás casos
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