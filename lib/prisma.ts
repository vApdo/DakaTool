import { PrismaClient } from "@prisma/client"

/**
 * Prisma client singleton — tránh tạo nhiều connection khi Next.js hot-reload.
 * Dùng chung cho API route handlers và Node worker.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
