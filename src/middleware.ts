import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  "/login",
  "/login-admin",
  "/api/auth/sign-in",
  "/api/auth/verify",
  "/api/auth/auth-debug",
  "/api/auth/callback",
  "/api/auth/session",
  "/api/auth/csrf"
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
  
  console.log(`🛡️ [MIDDLEWARE] Procesando ruta: ${pathname}`);
  
  // Si es una ruta pública, permitir acceso sin restricciones
  if (isPublicRoute(pathname)) {
    console.log(`✅ [MIDDLEWARE] Acceso permitido a ruta pública: ${pathname}`);
    return NextResponse.next();
  }
  
  // Si es una ruta de API (excepto las que requieren autenticación específica), permitir acceso
  if (isApiRoute(pathname) && !pathname.includes('/api/protected/')) {
    console.log(`✅ [MIDDLEWARE] Acceso permitido a API: ${pathname}`);
    return NextResponse.next();
  }
  
  // Obtener token de sesión
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Depuración para ver el token
  console.log(`🔑 [MIDDLEWARE] Ruta ${pathname}, Token:`, token ? JSON.stringify({
    id: token.id,
    role: token.role,
    storeId: token.storeId || 'N/A'
  }) : "No token");
  
  // Si no hay token y no es ruta pública, redirigir a login
  if (!token) {
    console.log(`🚫 [MIDDLEWARE] Acceso denegado: No hay sesión. Redirigiendo a login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(loginUrl);
  }
  
  // Manejo de acceso para rutas de dashboard administrativo
  if (isAdminDashboardRoute(pathname)) {
    if (token.role !== 'ADMIN') {
      console.log(`🚫 [MIDDLEWARE] Acceso denegado: Intento de acceso a dashboard-admin por usuario no admin (${token.role})`);
      
      // Si es una tienda, redirigir a dashboard de tienda
      if (token.role === 'STORE') {
        console.log(`🔄 [MIDDLEWARE] Redirigiendo a usuario tienda al dashboard de tienda`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // Si no es admin ni tienda, redirigir a página de login
      console.log(`🔄 [MIDDLEWARE] Redirigiendo a usuario no identificado al login`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    console.log(`✅ [MIDDLEWARE] Acceso permitido al dashboard admin para usuario ADMIN`);
    return NextResponse.next();
  }
  
  // Manejo de acceso para rutas de dashboard de tienda
  if (isDashboardRoute(pathname)) {
    // Permitir acceso tanto a usuarios de tipo STORE como ADMIN
    if (token.role !== 'STORE' && token.role !== 'ADMIN') {
      console.log(`🚫 [MIDDLEWARE] Acceso denegado: Intento de acceso a dashboard por usuario que no es admin ni tienda (${token.role})`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    console.log(`✅ [MIDDLEWARE] Acceso permitido al dashboard de tienda para usuario ${token.role}`);
    return NextResponse.next();
  }
  
  // Para la raíz (/), redirigir según el rol
  if (pathname === '/') {
    if (token.role === 'ADMIN') {
      console.log(`🔄 [MIDDLEWARE] Redirigiendo a admin desde raíz al dashboard-admin`);
      return NextResponse.redirect(new URL('/dashboard-admin', request.url));
    } else if (token.role === 'STORE') {
      console.log(`🔄 [MIDDLEWARE] Redirigiendo a tienda desde raíz al dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Permitir acceso para todos los demás casos si hay un token
  console.log(`✅ [MIDDLEWARE] Acceso permitido a ${pathname} para usuario autenticado`);
  return NextResponse.next();
}

// Configurar en qué rutas se ejecutará el middleware
export const config = {
  matcher: [
    // Rutas protegidas
    '/',
    '/dashboard/:path*',
    '/dashboard-admin/:path*',
    '/api/protected/:path*',
  ]
}; 