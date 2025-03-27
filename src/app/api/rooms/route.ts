import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();

    if (!userId || !storeId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener salas de la tienda
    const rooms = await prisma.room.findMany({
      where: {
        storeId: storeId as string
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error('Error al obtener salas:', error);
    return NextResponse.json({ error: 'Error al obtener salas' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const { userId, storeId } = await verifyAuth();

    if (!userId || !storeId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener datos de la sala
    const body = await request.json();
    const { name, forSale, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    // Si la sala va a ser para ventas (forSale=true), actualizar todas las otras salas a forSale=false
    if (forSale) {
      await prisma.room.updateMany({
        where: {
          storeId: storeId as string,
        },
        data: {
          forSale: false,
        },
      });
    }

    // Crear sala
    const room = await prisma.room.create({
      data: {
        name,
        forSale: forSale || false,
        description,
        store: {
          connect: {
            id: storeId as string
          }
        }
      }
    });

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Error al crear sala:', error);
    return NextResponse.json({ error: 'Error al crear sala' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 