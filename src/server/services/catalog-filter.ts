import { Prisma } from "@prisma/client";
import { NO_COLLECTION, type CatalogParams, type Sort } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { visibleProductSql } from "@/server/repositories/visibility";

/** Các bộ lọc nhiều lựa chọn (B2). Cửa hàng chọn một nên xử lý riêng. */
export type GroupFilter = "brand" | "line" | "col" | "mat" | "typ" | "pr";

export type FilterInput = Pick<CatalogParams, "q"> &
  Partial<Pick<CatalogParams, "brand" | "line" | "col" | "mat" | "typ" | "pr">>;

export interface ScopeStore {
  id: string;
}

function likeEscape(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const uuids = (ids: string[]) => Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));

/** JOIN số liệu theo phạm vi: một cửa hàng hoặc view tổng (bí danh q). */
export function qtyJoinSql(store: ScopeStore | null) {
  return store
    ? Prisma.sql`LEFT JOIN store_product_qty q ON q.product_id = p.id AND q.store_id = ${store.id}::uuid`
    : Prisma.sql`LEFT JOIN product_totals q ON q.product_id = p.id`;
}

/**
 * Điều kiện WHERE dùng chung cho danh sách và đếm (B1, B2, B5, B6, B7).
 * - Trong một bộ lọc: HOẶC (IN); giữa các bộ lọc: VÀ (nối bằng AND).
 * - `omit`: bỏ một bộ lọc khi đếm lựa chọn của chính nó (B4); "store" bỏ điều kiện phạm vi cửa hàng.
 * Yêu cầu các bí danh của visibleProductJoinsSql và qtyJoinSql.
 */
export function buildWhere(
  f: FilterInput,
  opts: { store: ScopeStore | null; all: boolean; omit?: GroupFilter | "store" },
): Prisma.Sql[] {
  const where: Prisma.Sql[] = [visibleProductSql];

  if (opts.store && !opts.all && opts.omit !== "store") {
    where.push(Prisma.sql`COALESCE(q.qty_ordered, 0) > 0`);
  }
  if (f.q) where.push(Prisma.sql`p.sku ILIKE ${"%" + likeEscape(f.q) + "%"}`);

  const brand = f.brand ?? [];
  if (opts.omit !== "brand" && brand.length > 0)
    where.push(Prisma.sql`p.brand_id IN (${uuids(brand)})`);
  const line = f.line ?? [];
  if (opts.omit !== "line" && line.length > 0)
    where.push(Prisma.sql`p.product_line_id IN (${uuids(line)})`);
  const mat = f.mat ?? [];
  if (opts.omit !== "mat" && mat.length > 0)
    where.push(Prisma.sql`p.material_id IN (${uuids(mat)})`);

  const typ = f.typ ?? [];
  // SP chưa có chủng loại không khớp khi đang lọc chủng loại.
  if (opts.omit !== "typ" && typ.length > 0)
    where.push(Prisma.sql`p.product_type_id IN (${uuids(typ)})`);

  const pr = f.pr ?? [];
  // SP chưa có khung giá không khớp khi đang lọc khung giá.
  if (opts.omit !== "pr" && pr.length > 0)
    where.push(Prisma.sql`p.price_range_id IN (${uuids(pr)})`);

  const col = f.col ?? [];
  if (opts.omit !== "col" && col.length > 0) {
    const ids = col.filter((c) => c !== NO_COLLECTION);
    const parts: Prisma.Sql[] = [];
    if (ids.length > 0) parts.push(Prisma.sql`p.collection_id IN (${uuids(ids)})`);
    if (col.includes(NO_COLLECTION)) parts.push(Prisma.sql`p.collection_id IS NULL`);
    where.push(Prisma.sql`(${Prisma.join(parts, " OR ")})`);
  }
  return where;
}

/**
 * ORDER BY theo kiểu sắp xếp (B8); luôn kèm Mã SP để thứ tự ổn định khi phân trang.
 * "Mới cập nhật" theo `updated_at` của SP; "Còn thiếu nhiều nhất" theo phạm vi đang xem.
 */
export function orderBySql(sort: Sort) {
  switch (sort) {
    case "updated":
      return Prisma.sql`p.updated_at DESC, p.sku ASC`;
    case "price_asc":
      return Prisma.sql`p.price_vnd ASC NULLS LAST, p.sku ASC`;
    case "price_desc":
      return Prisma.sql`p.price_vnd DESC NULLS LAST, p.sku ASC`;
    case "shortage":
      return Prisma.sql`GREATEST(COALESCE(q.qty_ordered, 0) - COALESCE(q.qty_received, 0), 0) DESC, p.sku ASC`;
    case "sold":
      return Prisma.sql`COALESCE(q.qty_sold, 0) DESC, p.sku ASC`;
    default:
      return Prisma.sql`p.sku ASC`;
  }
}

/** Cửa hàng đang hiện theo mã (không phân biệt hoa/thường); không có → null. */
export async function findActiveStore(code: string | null) {
  if (!code) return null;
  return prisma.store.findFirst({
    where: { code: { equals: code, mode: "insensitive" }, active: true },
    select: { id: true, code: true, name: true },
  });
}
