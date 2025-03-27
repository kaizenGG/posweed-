import { NextRequest, NextResponse } from "next/server";
import { verifyJwtAccessToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema para validar la creación de una sala
const createRoomSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  forSale: z.boolean().optional(),
  description: z.string().optional()
});

// GET - Obtener salas de inventario para la tienda actual
export async function GET(req: NextRequest) {
  try {
    console.log("[API Inventory] Getting rooms");
    
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Inventory] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Inventory] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Inventory] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Inventory] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Obtener todas las salas de la tienda
    const rooms = await prisma.room.findMany({
      where: {
        storeId
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`[API Inventory] Found ${rooms.length} rooms`);
    
    return NextResponse.json(rooms);
    
  } catch (error) {
    console.error("[API Inventory] Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva sala
export async function POST(req: NextRequest) {
  try {
    console.log("[API Inventory] Creating new room");
    
    // Verificar autenticación
    const token = req.cookies.get("session_token")?.value;
    
    if (!token) {
      console.log("[API Inventory] No session token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let storeId: string;
    
    try {
      const payload = await verifyJwtAccessToken(token) as { id: string, role: string, storeId: string };
      
      if (!payload || !payload.storeId) {
        console.log("[API Inventory] Invalid or missing storeId in token:", payload);
        return NextResponse.json({ error: "Unauthorized - Invalid store access" }, { status: 403 });
      }
      
      storeId = payload.storeId;
      console.log(`[API Inventory] Verified user with storeId: ${storeId}`);
    } catch (error) {
      console.error("[API Inventory] Error verifying JWT:", error);
      return NextResponse.json({ error: "Authentication error" }, { status: 401 });
    }
    
    // Obtener los datos de la solicitud
    const body = await req.json();
    
    // Validar datos
    const validationResult = createRoomSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("[API Inventory] Validation error:", validationResult.error);
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, forSale, description } = validationResult.data;
    
    // Verificar si ya existe una sala con el mismo nombre
    const existingRoom = await prisma.room.findFirst({
      where: {
        storeId,
        name
      }
    });
    
    if (existingRoom) {
      return NextResponse.json(
        { error: "A room with this name already exists" },
        { status: 409 }
      );
    }
    
    // Si forSale es true, actualizar todas las otras salas a forSale=false
    if (forSale) {
      console.log("[API Inventory] Setting forSale=false for all other rooms as the new room will be the sales point");
      await prisma.room.updateMany({
        where: {
          storeId
        },
        data: {
          forSale: false
        }
      });
    }
    
    // Crear la nueva sala
    const newRoom = await prisma.room.create({
      data: {
        name,
        forSale: forSale || false,
        description,
        storeId
      }
    });
    
    console.log(`[API Inventory] Created new room: ${newRoom.name}`);
    
    return NextResponse.json(newRoom);
    
  } catch (error) {
    console.error("[API Inventory] Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
} 