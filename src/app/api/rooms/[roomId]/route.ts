import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';

const prisma = new PrismaClient();

interface Params {
  params: {
    roomId: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();

    if (!userId || !storeId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json({ error: 'ID de sala no proporcionado' }, { status: 400 });
    }

    // Obtener sala
    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId: storeId as string
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Error al obtener sala:', error);
    return NextResponse.json({ error: 'Error al obtener sala' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();

    if (!userId || !storeId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json({ error: 'ID de sala no proporcionado' }, { status: 400 });
    }

    // Verificar que la sala pertenece a la tienda
    const existingRoom = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId: storeId as string
      }
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    // Obtener datos de la sala
    const body = await request.json();
    const { name, forSale, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    // Si forSale cambia a true, actualizar todas las otras salas a forSale=false
    if (forSale && !existingRoom.forSale) {
      await prisma.room.updateMany({
        where: {
          storeId: storeId as string,
          id: {
            not: roomId
          }
        },
        data: {
          forSale: false
        }
      });
    }

    // Actualizar sala
    const updatedRoom = await prisma.room.update({
      where: {
        id: roomId
      },
      data: {
        name,
        forSale: forSale !== undefined ? forSale : existingRoom.forSale,
        description: description !== undefined ? description : existingRoom.description
      }
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error('Error al actualizar sala:', error);
    return NextResponse.json({ error: 'Error al actualizar sala' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();

    if (!userId || !storeId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { roomId } = params;

    if (!roomId) {
      return NextResponse.json({ error: 'ID de sala no proporcionado' }, { status: 400 });
    }

    // Verificar que la sala pertenece a la tienda
    const existingRoom = await prisma.room.findUnique({
      where: {
        id: roomId,
        storeId: storeId as string
      }
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    // Eliminar sala
    await prisma.room.delete({
      where: {
        id: roomId
      }
    });

    return NextResponse.json({ success: true, message: 'Sala eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar sala:', error);
    return NextResponse.json({ error: 'Error al eliminar sala' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 