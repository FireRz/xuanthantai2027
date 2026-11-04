import { Prisma } from "@prisma/client";
import { computeMetrics, sellThrough } from "@/lib/metrics";
import type { GroupDim } from "@/lib/analytics-params";
import type { CatalogParams } from "@/lib/catalog-params";
import type { StockStatus } from "@/lib/status";
import { prisma } from "@/server/db";
import { catalogFromSql, findActiveStore } from "./catalog";

/** Bộ lọc và phạm vi cửa hàng giống danh mục (không sắp xếp, phân trang). */
export type AnalyticsParams = Pick<
  CatalogParams,
  "brand" | "line" | "col" | "mat" | "typ" | "pr" | "store" | "all" | "q"
>;

export interface AnalyticsTotals {
  products: number;
  ordered: number;
  received: number;
  /** Σ từng SP max(Đặt − Về, 0), không phải ΣĐặt − ΣVề. */
  shortage: number;
  sold: number;
  stock: number;
  /** min(ΣVề / ΣĐặt, 1); ΣĐặt = 0 → null. */
  receivedRate: number | null;
  /** Bán / (Bán + Tồn); cả hai bằng 0 → null. */
  sellRate: number | null;
}

export interface AnalyticsSummary extends AnalyticsTotals {
  status: Record<StockStatus, number>;
  /** Số SP có Về > 0 và Tồn = 0. */
  soldOut: number;
}

// Biểu thức số liệu từng SP trên bí danh q của catalogFromSql.
const ORDERED = Prisma.sql`COALESCE(q.qty_ordered, 0)`;
const RECEIVED = Prisma.sql`COALESCE(q.qty_received, 0)`;
const SOLD = Prisma.sql`COALESCE(q.qty_sold, 0)`;
const STOCK = Prisma.sql`COALESCE(q.qty_stock, 0)`;

/**
 * Danh sách cột SELECT cho số tổng (bí danh: products, ordered, received, shortage, sold, stock).
 * Dùng chung với phân nhóm theo chiều (GROUP BY) — kết quả đọc bằng `rowToTotals`.
 */
export function totalsSelectSql() {
  return Prisma.sql`COUNT(*)::bigint AS products,
    COALESCE(SUM(${ORDERED}), 0)::bigint AS ordered,
    COALESCE(SUM(${RECEIVED}), 0)::bigint AS received,
    COALESCE(SUM(GREATEST(${ORDERED} - ${RECEIVED}, 0)), 0)::bigint AS shortage,
    COALESCE(SUM(${SOLD}), 0)::bigint AS sold,
    COALESCE(SUM(${STOCK}), 0)::bigint AS stock`;
}

export type TotalsRow = {
  products: bigint;
  ordered: bigint;
  received: bigint;
  shortage: bigint;
  sold: bigint;
  stock: bigint;
};

/** Đổi một dòng của `totalsSelectSql` thành AnalyticsTotals (tính các tỷ lệ). */
export function rowToTotals(r: TotalsRow): AnalyticsTotals {
  const ordered = Number(r.ordered);
  const received = Number(r.received);
  const sold = Number(r.sold);
  const stock = Number(r.stock);
  return {
    products: Number(r.products),
    ordered,
    received,
    shortage: Number(r.shortage),
    sold,
    stock,
    receivedRate: computeMetrics(ordered, received).rate,
    sellRate: sellThrough(sold, stock),
  };
}

type SummaryRow = TotalsRow & {
  st_noorder: bigint;
  st_none: bigint;
  st_full: bigint;
  st_short: bigint;
  sold_out: bigint;
};

/** Số tổng, số mã theo trạng thái và số mã hết hàng — một câu SQL trên đúng tập SP của danh mục. */
export async function getAnalyticsSummary(params: AnalyticsParams): Promise<AnalyticsSummary> {
  const store = await findActiveStore(params.store);
  const from = catalogFromSql(params, store);
  // Thứ tự giống stockStatus: Đặt=0 → Về=0 → Thiếu=0 → còn lại.
  const rows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT ${totalsSelectSql()},
      COUNT(*) FILTER (WHERE ${ORDERED} = 0)::bigint AS st_noorder,
      COUNT(*) FILTER (WHERE ${ORDERED} <> 0 AND ${RECEIVED} = 0)::bigint AS st_none,
      COUNT(*) FILTER (WHERE ${ORDERED} <> 0 AND ${RECEIVED} <> 0
        AND GREATEST(${ORDERED} - ${RECEIVED}, 0) = 0)::bigint AS st_full,
      COUNT(*) FILTER (WHERE ${ORDERED} <> 0 AND ${RECEIVED} <> 0
        AND GREATEST(${ORDERED} - ${RECEIVED}, 0) > 0)::bigint AS st_short,
      COUNT(*) FILTER (WHERE ${RECEIVED} > 0 AND ${STOCK} = 0)::bigint AS sold_out
    ${from}`;
  const r = rows[0];
  return {
    ...rowToTotals(r),
    status: {
      noorder: Number(r.st_noorder),
      none: Number(r.st_none),
      full: Number(r.st_full),
      short: Number(r.st_short),
    },
    soldOut: Number(r.sold_out),
  };
}

export interface TopItem {
  sku: string;
  name: string | null;
  thumbUrl: string | null;
  value: number;
}

/** Top SP bán nhiều nhất hoặc còn thiếu nhiều nhất: chỉ value > 0, giảm dần, hòa theo mã tăng dần. */
export async function getTopProducts(
  params: AnalyticsParams,
  kind: "sold" | "shortage",
  limit = 10,
): Promise<TopItem[]> {
  const store = await findActiveStore(params.store);
  const from = catalogFromSql(params, store);
  const value = kind === "sold" ? SOLD : Prisma.sql`GREATEST(${ORDERED} - ${RECEIVED}, 0)`;
  const rows = await prisma.$queryRaw<
    { sku: string; name: string | null; thumb_url: string | null; value: number }[]
  >`
    SELECT p.sku, p.name, p.thumb_url, (${value})::int AS value
    ${from}
    AND (${value}) > 0
    ORDER BY value DESC, p.sku ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ sku: r.sku, name: r.name, thumbUrl: r.thumb_url, value: r.value }));
}

export interface GroupRow extends AnalyticsTotals {
  /** Id UUID, mã cửa hàng, hoặc null cho dòng rỗng. */
  id: string | null;
  name: string;
}

/** Khóa ngoại trên bí danh p, bí danh bảng tên (đã JOIN trong catalogFromSql) và tên dòng rỗng. */
const ATTR_DIMS: Record<
  Exclude<GroupDim, "store">,
  { fk: Prisma.Sql; label: Prisma.Sql; empty: string }
> = {
  brand: { fk: Prisma.sql`p.brand_id`, label: Prisma.sql`b.name`, empty: "Chưa có nhãn" },
  line: { fk: Prisma.sql`p.product_line_id`, label: Prisma.sql`l.name`, empty: "Chưa có dòng" },
  col: { fk: Prisma.sql`p.collection_id`, label: Prisma.sql`c.name`, empty: "Ngoài bộ sưu tập" },
  mat: { fk: Prisma.sql`p.material_id`, label: Prisma.sql`m.name`, empty: "Chưa có tuổi vàng" },
  typ: {
    fk: Prisma.sql`p.product_type_id`,
    label: Prisma.sql`pt.name`,
    empty: "Chưa có chủng loại",
  },
  pr: { fk: Prisma.sql`p.price_range_id`, label: Prisma.sql`pr.name`, empty: "Ngoài khung giá" },
};

type GroupSqlRow = TotalsRow & { id: string | null; name: string };

/**
 * Bảng so sánh theo nhóm (§5.3). Chiều thuộc tính SP: GROUP BY khóa ngoại trên đúng tập SP
 * của danh mục; giá trị rỗng gộp một dòng (id null). Chiều cửa hàng: theo cặp (SP, cửa hàng đang hiện).
 * Sắp theo Số mã giảm dần, hòa theo tên; không có dòng cho nhóm không có SP.
 */
export async function getGroupBreakdown(
  params: AnalyticsParams,
  dim: GroupDim,
): Promise<GroupRow[]> {
  const store = await findActiveStore(params.store);
  const from = catalogFromSql(params, store);

  let rows: GroupSqlRow[];
  if (dim === "store") {
    // Mỗi cặp (SP trong tập, cửa hàng đang hiện) có dòng SL. Số mã chỉ đếm cặp có đặt > 0;
    // cửa hàng có cặp nhưng toàn đặt = 0 vẫn có dòng (Số mã 0) để tổng Về/Bán/Tồn khớp số tổng.
    // Cửa hàng không có cặp nào trong tập thì không có dòng.
    const onlyStore = store ? Prisma.sql`AND st.id = ${store.id}::uuid` : Prisma.empty;
    rows = await prisma.$queryRaw<GroupSqlRow[]>`
      WITH s AS (SELECT p.id ${from})
      SELECT st.code AS id, st.name,
        (COUNT(*) FILTER (WHERE q.qty_ordered > 0))::bigint AS products,
        COALESCE(SUM(q.qty_ordered), 0)::bigint AS ordered,
        COALESCE(SUM(q.qty_received), 0)::bigint AS received,
        COALESCE(SUM(GREATEST(q.qty_ordered - q.qty_received, 0)), 0)::bigint AS shortage,
        COALESCE(SUM(q.qty_sold), 0)::bigint AS sold,
        COALESCE(SUM(q.qty_stock), 0)::bigint AS stock
      FROM s
      JOIN store_product_qty q ON q.product_id = s.id
      JOIN store st ON st.id = q.store_id AND st.active ${onlyStore}
      GROUP BY st.id, st.code, st.name
      ORDER BY products DESC, st.name ASC`;
  } else {
    const { fk, label, empty } = ATTR_DIMS[dim];
    rows = await prisma.$queryRaw<GroupSqlRow[]>`
      SELECT (${fk})::text AS id, COALESCE(MAX(${label}), ${empty}) AS name, ${totalsSelectSql()}
      ${from}
      GROUP BY ${fk}
      ORDER BY products DESC, name ASC`;
  }
  return rows.map((r) => ({ id: r.id, name: r.name, ...rowToTotals(r) }));
}
