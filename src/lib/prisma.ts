import { PrismaClient } from '@prisma/client';

// Prevenir múltiples instancias de Prisma en desarrollo
// Esto es importante porque Next.js realiza Hot Reloading
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 