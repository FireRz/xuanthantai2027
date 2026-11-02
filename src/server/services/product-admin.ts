import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/** Danh sách SP cho quản trị: thấy cả SP đang ẩn (ADR-008 P2). */

export const ADMIN_PAGE_SIZE = 25;

export type StatusFilter = "all" | "active" | "hidden";

export interface AdminProductQuery {
  q?: string;
  brandId?: string;
  status?: StatusFilter;
  /** Chỉ SP chưa có ảnh (T07.9). */
  noImage?: boolean;
  page?: number;
  pageSize?: number;
}

export function adminProductWhere(query: AdminProductQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  const q = query.q?.trim();
  if (q) and.push({ sku: { contains: q, mode: "insensitive" } });
  if (query.brandId) and.push({ brandId: query.brandId });
  if (query.status === "active") and.push({ active: true });
  if (query.status === "hidden") and.push({ active: false });
  if (query.noImage) and.push({ imageUrl: null });
  return and.length ? { AND: and } : {};
}

export async function listAdminProducts(query: AdminProductQuery) {
  const pageSize = query.pageSize ?? ADMIN_PAGE_SIZE;
  const where = adminProductWhere(query);
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), pages);
  const rows = await prisma.product.findMany({
    where,
    orderBy: { sku: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      sku: true,
      name: true,
      priceVnd: true,
      thumbUrl: true,
      imageUrl: true,
      active: true,
      brand: { select: { name: true } },
      productLine: { select: { name: true } },
      collection: { select: { name: true } },
      material: { select: { name: true } },
    },
  });
  return { rows, total, page, pages, pageSize };
}
