import { computeMetrics, totalMetrics, type QtyMetrics } from "@/lib/metrics";
import { sameRegion } from "@/lib/region";
import { prisma } from "@/server/db";
import { visibleProductWhere } from "@/server/repositories/visibility";

export interface StoreQtyRow {
  code: string;
  name: string;
  metrics: QtyMetrics;
  sold: number;
  stock: number;
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
  totalSold: number;
  totalStock: number;
  /** Đang lọc khu vực (có cửa hàng đang hiện): bảng và dòng tổng chỉ gồm cửa hàng của khu vực đó. */
  region: string | null;
  /** Đang lọc một cửa hàng đang hoạt động: số liệu riêng của cửa hàng đó (popup hiện ở phần tóm tắt). */
  scope: (StoreQtyRow & { storeCode: string }) | null;
}

/**
 * Chi tiết một SP cho popup (F05): thông tin + số liệu từng cửa hàng đang hoạt động + dòng tổng.
 * SP không tồn tại hoặc không hiển thị được (ẩn SP/nhãn/dòng/BST/tuổi vàng/khung giá) → null.
 * Mã không phân biệt hoa/thường.
 */
export async function getProductDetail(
  sku: string,
  storeCode?: string | null,
  regionCode?: string | null,
): Promise<ProductDetail | null> {
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
        quantities: {
          select: {
            storeId: true,
            qtyOrdered: true,
            qtyReceived: true,
            qtySold: true,
            qtyStock: true,
          },
        },
      },
    }),
    prisma.store.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, region: true },
      orderBy: { code: "asc" },
    }),
  ]);
  if (!product) return null;
  const regionStores = regionCode?.trim()
    ? stores.filter((s) => sameRegion(s.region, regionCode))
    : [];
  const region = regionStores.length > 0 ? regionStores[0]!.region!.trim() : null;
  const shown = region ? regionStores : stores;

  const byStore = new Map(product.quantities.map((q) => [q.storeId, q]));
  const rows = shown.map((s) => {
    const q = byStore.get(s.id);
    return {
      code: s.code,
      name: s.name,
      ordered: q?.qtyOrdered ?? 0,
      received: q?.qtyReceived ?? 0,
      sold: q?.qtySold ?? 0,
      stock: q?.qtyStock ?? 0,
    };
  });

  const storeRows: StoreQtyRow[] = rows.map((r) => ({
    code: r.code,
    name: r.name,
    metrics: computeMetrics(r.ordered, r.received),
    sold: r.sold,
    stock: r.stock,
  }));
  const wanted = storeCode?.trim().toUpperCase();
  const picked = wanted ? storeRows.find((s) => s.code.toUpperCase() === wanted) : undefined;

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
    stores: storeRows,
    total: totalMetrics(rows.map((r) => ({ ...r, storeActive: true }))),
    totalSold: rows.reduce((a, r) => a + r.sold, 0),
    totalStock: rows.reduce((a, r) => a + r.stock, 0),
    region,
    scope: picked ? { ...picked, storeCode: picked.code } : null,
  };
}
