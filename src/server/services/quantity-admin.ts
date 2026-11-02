import { prisma } from "@/server/db";

/** Truy vấn cho trang sửa nhanh SL (T08.4): quản trị thấy cả SP / cửa hàng đang ẩn. */

export const QTY_PAGE_SIZE = 30;

/** Một SP và SL tại mọi cửa hàng (chưa có số liệu → 0/0). */
export async function quantitiesForProduct(sku: string) {
  const found = await prisma.$queryRaw<{ id: string; sku: string; name: string | null }[]>`
    SELECT id, sku, name FROM product WHERE UPPER(sku) = UPPER(${sku.trim()}) LIMIT 1`;
  if (found.length === 0) return null;
  const product = found[0];
  const [stores, qtys] = await Promise.all([
    prisma.store.findMany({ orderBy: { code: "asc" } }),
    prisma.storeProductQty.findMany({ where: { productId: product.id } }),
  ]);
  const byStore = new Map(qtys.map((q) => [q.storeId, q]));
  return {
    product,
    rows: stores.map((s) => ({
      storeId: s.id,
      code: s.code,
      name: s.name,
      active: s.active,
      ordered: byStore.get(s.id)?.qtyOrdered ?? 0,
      received: byStore.get(s.id)?.qtyReceived ?? 0,
    })),
  };
}

/** Một cửa hàng và SL của các SP (lọc theo mã, phân trang). */
export async function quantitiesForStore(
  code: string,
  opts: { q?: string; page?: number; pageSize?: number } = {},
) {
  const store = await prisma.store.findFirst({
    where: { code: { equals: code.trim(), mode: "insensitive" } },
  });
  if (!store) return null;
  const pageSize = opts.pageSize ?? QTY_PAGE_SIZE;
  const q = opts.q?.trim();
  const where = q ? { sku: { contains: q, mode: "insensitive" as const } } : {};
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pages);
  const products = await prisma.product.findMany({
    where,
    orderBy: { sku: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: { id: true, sku: true, name: true, active: true },
  });
  const qtys = await prisma.storeProductQty.findMany({
    where: { storeId: store.id, productId: { in: products.map((p) => p.id) } },
  });
  const byProduct = new Map(qtys.map((x) => [x.productId, x]));
  return {
    store,
    total,
    page,
    pages,
    rows: products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      active: p.active,
      ordered: byProduct.get(p.id)?.qtyOrdered ?? 0,
      received: byProduct.get(p.id)?.qtyReceived ?? 0,
    })),
  };
}
