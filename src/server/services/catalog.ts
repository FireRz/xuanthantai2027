import { Prisma } from "@prisma/client";
import { computeMetrics, type QtyMetrics } from "@/lib/metrics";
import { NO_COLLECTION, type CatalogParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { visibleProductJoinsSql, visibleProductSql } from "@/server/repositories/visibility";

/** Phạm vi số liệu: tổng hệ thống hoặc một cửa hàng (ADR-007). */
export type Scope = { kind: "total" } | { kind: "store"; code: string; name: string };

export interface ProductListItem {
  id: string;
  sku: string;
  name: string | null;
  priceVnd: number | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  brandName: string;
  lineName: string;
  collectionName: string | null;
  materialName: string | null;
  metrics: QtyMetrics;
}

export interface ProductListResult {
  items: ProductListItem[];
  /** Tổng số SP khớp (không tính giới hạn trang). */
  total: number;
  scope: Scope;
}

type Row = {
  id: string;
  sku: string;
  name: string | null;
  price_vnd: number | null;
  image_url: string | null;
  thumb_url: string | null;
  brand_name: string;
  line_name: string;
  collection_name: string | null;
  material_name: string | null;
  qty_ordered: number;
  qty_received: number;
};

type ListParams = Pick<CatalogParams, "store" | "all" | "q" | "col"> & {
  /** Số SP lấy về (mặc định 24). */
  limit?: number;
  offset?: number;
};

function likeEscape(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Cửa hàng đang hiện theo mã (không phân biệt hoa/thường); không có → null. */
export async function findActiveStore(code: string | null) {
  if (!code) return null;
  return prisma.store.findFirst({
    where: { code: { equals: code, mode: "insensitive" }, active: true },
    select: { id: true, code: true, name: true },
  });
}

/**
 * Danh sách SP hiển thị được kèm số liệu theo phạm vi:
 * - không chọn cửa hàng → tổng hệ thống (view product_totals, CH ẩn không cộng);
 * - chọn cửa hàng → số của cửa hàng đó, mặc định chỉ SP có đặt > 0 (ADR-002 D6), `all` hiện mọi SP.
 * Sắp xếp theo Mã A→Z. Cửa hàng không tồn tại/đã ẩn → rơi về tổng hệ thống.
 */
export async function listProducts(params: ListParams): Promise<ProductListResult> {
  const store = await findActiveStore(params.store);
  const limit = params.limit ?? 24;
  const offset = params.offset ?? 0;

  const where: Prisma.Sql[] = [visibleProductSql];
  if (store && !params.all) where.push(Prisma.sql`COALESCE(q.qty_ordered, 0) > 0`);
  if (params.q) where.push(Prisma.sql`p.sku ILIKE ${"%" + likeEscape(params.q) + "%"}`);
  if (params.col.length > 0) {
    const ids = params.col.filter((c) => c !== NO_COLLECTION);
    const parts: Prisma.Sql[] = [];
    if (ids.length > 0)
      parts.push(
        Prisma.sql`p.collection_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})`,
      );
    if (params.col.includes(NO_COLLECTION)) parts.push(Prisma.sql`p.collection_id IS NULL`);
    where.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
  }

  const qtyJoin = store
    ? Prisma.sql`LEFT JOIN store_product_qty q ON q.product_id = p.id AND q.store_id = ${store.id}::uuid`
    : Prisma.sql`LEFT JOIN product_totals q ON q.product_id = p.id`;
  const from = Prisma.sql`FROM product p ${visibleProductJoinsSql} ${qtyJoin} WHERE ${Prisma.join(where, " AND ")}`;

  const [rows, count] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      SELECT p.id, p.sku, p.name, p.price_vnd, p.image_url, p.thumb_url,
             b.name AS brand_name, l.name AS line_name, c.name AS collection_name, m.name AS material_name,
             COALESCE(q.qty_ordered, 0)::int AS qty_ordered, COALESCE(q.qty_received, 0)::int AS qty_received
      ${from}
      ORDER BY p.sku ASC
      LIMIT ${limit} OFFSET ${offset}`,
    prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n ${from}`,
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      priceVnd: r.price_vnd,
      imageUrl: r.image_url,
      thumbUrl: r.thumb_url,
      brandName: r.brand_name,
      lineName: r.line_name,
      collectionName: r.collection_name,
      materialName: r.material_name,
      metrics: computeMetrics(r.qty_ordered, r.qty_received),
    })),
    total: Number(count[0]?.n ?? 0),
    scope: store ? { kind: "store", code: store.code, name: store.name } : { kind: "total" },
  };
}

export interface CollectionCard {
  /** Id BST; null = thẻ "Ngoài bộ sưu tập". */
  id: string | null;
  name: string;
  brandName: string | null;
  productCount: number;
  /** Ảnh = thumbnail của SP đầu tiên theo mã trong BST (mặc định kỹ thuật, UI-DESIGN §5). */
  thumbUrl: string | null;
}

type CardRow = {
  id: string | null;
  name: string | null;
  brand_name: string | null;
  n: number;
  thumb_url: string | null;
};

/**
 * Thẻ Bộ sưu tập mùa này: số SP hiển thị được theo từng BST đang hiện + thẻ "Ngoài bộ sưu tập".
 * Đếm theo cùng phạm vi cửa hàng với danh sách (chọn CH, không bật `all` → chỉ SP CH đó đặt > 0).
 * BST không có SP nào trong phạm vi thì không hiện thẻ.
 */
export async function listCollectionCards(
  params: Pick<CatalogParams, "store" | "all">,
): Promise<CollectionCard[]> {
  const store = await findActiveStore(params.store);
  const where: Prisma.Sql[] = [visibleProductSql];
  if (store && !params.all) where.push(Prisma.sql`COALESCE(q.qty_ordered, 0) > 0`);
  const qtyJoin = store
    ? Prisma.sql`LEFT JOIN store_product_qty q ON q.product_id = p.id AND q.store_id = ${store.id}::uuid`
    : Prisma.sql`LEFT JOIN product_totals q ON q.product_id = p.id`;

  const rows = await prisma.$queryRaw<CardRow[]>`
    SELECT c.id, c.name, cb.name AS brand_name, COUNT(*)::int AS n,
           (ARRAY_AGG(p.thumb_url ORDER BY p.sku))[1] AS thumb_url
    FROM product p ${visibleProductJoinsSql}
    LEFT JOIN brand cb ON cb.id = c.brand_id
    ${qtyJoin}
    WHERE ${Prisma.join(where, " AND ")}
    GROUP BY c.id, c.name, cb.name
    ORDER BY (c.id IS NULL), cb.name, c.name`;

  return rows.map((r) => ({
    id: r.id,
    name: r.id ? (r.name ?? "") : "Ngoài bộ sưu tập",
    brandName: r.brand_name,
    productCount: r.n,
    thumbUrl: r.thumb_url,
  }));
}
