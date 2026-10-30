import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db";
import { assertSameBrand } from "@/server/services/classification";
import { visibleProductWhere } from "./visibility";

type Db = PrismaClient | Prisma.TransactionClient;

export type CreateProductData = {
  sku: string;
  name?: string | null;
  brandId: string;
  productLineId: string;
  collectionId?: string | null;
  materialId?: string | null;
  priceVnd?: number | null;
};

/** Danh sách SP hiển thị được (thứ tự mặc định: mã A→Z). */
export function findVisibleProducts(db: Db = prisma, where: Prisma.ProductWhereInput = {}) {
  return db.product.findMany({
    where: { AND: [visibleProductWhere, where] },
    orderBy: { sku: "asc" },
  });
}

export async function isProductVisible(id: string, db: Db = prisma): Promise<boolean> {
  const count = await db.product.count({ where: { AND: [visibleProductWhere, { id }] } });
  return count > 0;
}

/** Tạo SP; mã được bỏ khoảng trắng đầu/cuối (ADR-003), kiểm tra cùng nhãn. */
export async function createProduct(data: CreateProductData, db: Db = prisma) {
  await assertSameBrand(db, data);
  return db.product.create({ data: { ...data, sku: data.sku.trim() } });
}

/** Đổi nhãn/dòng/BST của SP (mã SP không bao giờ đổi — ADR-008 P1). */
export async function updateProductClassification(
  id: string,
  data: { brandId: string; productLineId: string; collectionId?: string | null },
  db: Db = prisma,
) {
  await assertSameBrand(db, data);
  return db.product.update({ where: { id }, data });
}
