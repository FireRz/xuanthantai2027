import { PrismaClient } from "@prisma/client";

// Một PrismaClient cho cả tiến trình (tránh tạo nhiều kết nối khi Next.js hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
