import { computeMetrics, totalMetrics, type QtyMetrics } from "@/lib/metrics";
import { prisma } from "@/server/db";
import { visibleProductWhere } from "@/server/repositories/visibility";

export interface StoreQtyRow {
  code: string;
  name: string;
  metrics: QtyMetrics;
}

export interface ProductDetail {
  sku: string;
  name: string | null;
  priceVnd: number | null;
  /** Ảnh lớn (≈1600px); chưa có ảnh → null. */
  imageUrl: string | null;
  thumbUrl: string | null;
  brandName: string;
  lineName: string;
  collectionName: string | null;
  materialName: string | null;
  productTypeName: string | null;
  /** Mọi cửa hàng đang hoạt động theo mã, kể cả cửa hàng chưa có số liệu (hiện 0). */
  stores: StoreQtyRow[];
  /** Tính trên số tổng của các cửa hàng đang hoạt động (ADR-007). */
  total: QtyMetrics;
}

/**
 * Chi tiết một SP cho popup (F05): thông tin + số liệu từng cửa hàng đang hoạt động + dòng tổng.
 * SP không tồn tại hoặc không hiển thị được (ẩn SP/nhãn/dòng/BST/tuổi vàng/khung giá) → null.
 * Mã không phân biệt hoa/thường.
 */
export async function getProductDetail(sku: string): Promise<ProductDetail | null> {
  const code = sku.trim();
  if (!code) return null;
  const [product, stores] = await Promise.all([
    prisma.product.findFirst({
      where: { sku: { equals: code, mode: "insensitive" }, ...visibleProductWhere },
      include: {
        brand: { select: { name: true } },
        productLine: { select: { name: true } },
        collection: { select: { name: true } },
        material: { select: { name: true } },
        productType: { select: { name: true } },
        quantities: { select: { storeId: true, qtyOrdered: true, qtyReceived: true } },
      },
    }),
    prisma.store.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);
  if (!product) return null;

  const byStore = new Map(product.quantities.map((q) => [q.storeId, q]));
  const rows = stores.map((s) => {
    const q = byStore.get(s.id);
    return {
      code: s.code,
      name: s.name,
      ordered: q?.qtyOrdered ?? 0,
      received: q?.qtyReceived ?? 0,
    };
  });

  return {
    sku: product.sku,
    name: product.name,
    priceVnd: product.priceVnd,
    imageUrl: product.imageUrl,
    thumbUrl: product.thumbUrl,
    brandName: product.brand.name,
    lineName: product.productLine.name,
    collectionName: product.collection?.name ?? null,
    materialName: product.material?.name ?? null,
    productTypeName: product.productType?.name ?? null,
    stores: rows.map((r) => ({
      code: r.code,
      name: r.name,
      metrics: computeMetrics(r.ordered, r.received),
    })),
    total: totalMetrics(rows.map((r) => ({ ...r, storeActive: true }))),
  };
}
