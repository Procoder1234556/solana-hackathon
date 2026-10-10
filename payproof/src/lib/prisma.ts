import "server-only";
import { PrismaClient } from "@prisma/client";

// ponytail: global singleton pattern for Next.js dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
