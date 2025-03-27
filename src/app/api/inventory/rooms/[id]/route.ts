import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyJwtAccessToken } from "@/lib/jwt";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// Schema para validar las actualizaciones de la sala
const roomUpdateSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  forSale: z.boolean().optional(),
  description: z.string().optional()
});

export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    console.log(`[API Inventory] Updating room with id: ${context.params.id}`);
    
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

    const roomId = context.params.id;
    
    // Obtener y validar los datos
    const body = await req.json();
    const validationResult = roomUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Si forSale es true, actualizar todas las otras salas a forSale=false
    if (data.forSale) {
      console.log("[API Inventory] Setting forSale=false for all other rooms as this room will be the sales point");
      await prisma.room.updateMany({
        where: {
          storeId,
          id: {
            not: roomId
          }
        },
        data: {
          forSale: false
        }
      });
    }
    
    // Actualizar la sala
    const updatedRoom = await prisma.room.update({
      where: {
        id: roomId,
        storeId
      },
      data
    });
    
    console.log(`[API Inventory] Updated room: ${updatedRoom.name}`);
    return NextResponse.json(updatedRoom);
    
  } catch (error: any) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Failed to update room", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    console.log(`[API Inventory] Deleting room with id: ${context.params.id}`);
    
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

    const roomId = context.params.id;
    
    // Verificar si la sala tiene inventario asociado
    const inventoryCount = await prisma.inventoryItem.count({
      where: {
        roomId: roomId,
        storeId
      }
    });
    
    if (inventoryCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete room with inventory items. Move items to another room first." },
        { status: 400 }
      );
    }
    
    // Eliminar la sala dentro de una transacción
    const deletedRoom = await prisma.$transaction(async (tx) => {
      // Eliminamos la sala
      const room = await tx.room.delete({
        where: {
          id: roomId,
          storeId
        }
      });
      
      return room;
    });
    
    console.log(`[API Inventory] Deleted room: ${deletedRoom.name}`);
    return NextResponse.json({ message: "Room deleted successfully" });
    
  } catch (error: any) {
    console.error("Error deleting room:", error);
    
    // Si la sala no existe
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete room", details: error.message },
      { status: 500 }
    );
  }
} 