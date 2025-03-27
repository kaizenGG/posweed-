import { verify } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// Función para verificar el token de autenticación
export async function verifyAuthToken(req: Request) {
  try {
    // Obtener el token de las cookies
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key) acc[key] = value;
      return acc;
    }, {} as { [key: string]: string });
    
    const token = cookies["session_token"] || cookies["auth_token"];
    
    // Si no hay token en cookies, intentar obtenerlo del body si es POST
    let tokenFromBody = null;
    if (!token && req.method === "POST") {
      try {
        const body = await req.clone().json();
        tokenFromBody = body.token;
      } catch (e) {
        // Ignorar errores al parsear el body
      }
    }
    
    // Si no se encuentra un token, retornar error
    if (!token && !tokenFromBody) {
      return {
        success: false,
        error: "No se proporcionó un token de autenticación"
      };
    }
    
    // Verificar el token
    const decodedToken: any = verify(
      token || tokenFromBody,
      process.env.NEXTAUTH_SECRET || "fallback-secret"
    );
    
    if (!decodedToken || !decodedToken.id) {
      return {
        success: false,
        error: "Token inválido"
      };
    }
    
    // Verificar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            username: true,
            status: true
          }
        }
      }
    });
    
    if (!user) {
      return {
        success: false,
        error: "Usuario no encontrado"
      };
    }
    
    // Si el token tiene datos de tienda, verificar que exista
    let storeId = decodedToken.storeId;
    
    if (storeId) {
      const storeInToken = user.stores.find(store => store.id === storeId);
      
      if (!storeInToken) {
        return {
          success: false,
          error: "Tienda no encontrada para este usuario"
        };
      }
      
      if (storeInToken.status !== "ACTIVE") {
        return {
          success: false,
          error: "Esta tienda está inactiva o suspendida"
        };
      }
    } else if (user.role === "STORE" && user.stores.length > 0) {
      // Para usuarios STORE, usar la primera tienda activa
      const activeStore = user.stores.find(store => store.status === "ACTIVE");
      
      if (!activeStore) {
        return {
          success: false,
          error: "Usuario sin tiendas activas"
        };
      }
      
      storeId = activeStore.id;
    }
    
    return {
      success: true,
      userId: user.id,
      storeId,
      role: user.role,
      user
    };
    
  } catch (error) {
    console.error("Error verificando token:", error);
    return {
      success: false,
      error: "Error al verificar el token"
    };
  }
}

// Función para verificar la autenticación en API routes que usan cookies
export async function verifyAuth() {
  try {
    console.log("[API Verify] Verificando token...");
    
    // Obtener cookies de manera asíncrona
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value || cookieStore.get("session_token")?.value;
    
    if (!token) {
      throw new Error("No se proporcionó un token de autenticación");
    }
    
    // Verificar el token
    const decodedToken: any = verify(
      token,
      process.env.NEXTAUTH_SECRET || "fallback-secret"
    );
    
    if (!decodedToken || !decodedToken.id) {
      throw new Error("Token inválido");
    }
    
    // Verificar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            username: true,
            status: true
          }
        }
      }
    });
    
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    
    // Si el token tiene datos de tienda, verificar que exista
    let storeId = decodedToken.storeId;
    
    if (storeId) {
      const storeInToken = user.stores.find(store => store.id === storeId);
      
      if (!storeInToken) {
        throw new Error("Tienda no encontrada para este usuario");
      }
      
      if (storeInToken.status !== "ACTIVE") {
        throw new Error("Esta tienda está inactiva o suspendida");
      }
    } else if (user.role === "STORE" && user.stores.length > 0) {
      // Para usuarios STORE, usar la primera tienda activa
      const activeStore = user.stores.find(store => store.status === "ACTIVE");
      
      if (!activeStore) {
        throw new Error("Usuario sin tiendas activas");
      }
      
      storeId = activeStore.id;
    }
    
    console.log("[API Verify] Token válido para ID de usuario:", user.id);
    
    return {
      userId: user.id,
      storeId,
      role: user.role,
      user
    };
    
  } catch (error) {
    console.error("[API Verify] Error al verificar la autenticación:", error);
    throw new Error("Error al verificar la autenticación");
  }
} 