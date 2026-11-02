import { Prisma } from "@prisma/client";
import { NO_COLLECTION, type CatalogParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { visibleProductJoinsSql } from "@/server/repositories/visibility";
import {
  buildWhere,
  findActiveStore,
  qtyJoinSql,
  type FilterInput,
  type GroupFilter,
} from "./catalog-filter";

export interface FacetOption {
  /** Id (UUID), `none` (Không thuộc BST) hoặc mã cửa hàng. */
  id: string;
  name: string;
  /** Số SP nhận được khi chọn lựa chọn này, theo các bộ lọc khác đang áp dụng (B4). */
  count: number;
  /** Nhãn sở hữu (dòng, BST) — dùng bỏ lựa chọn không hợp lệ khi đổi nhãn (B3). */
  brandId?: string;
  brandName?: string;
}

export interface FacetCounts {
  brand: FacetOption[];
  line: FacetOption[];
  col: FacetOption[];
  mat: FacetOption[];
  store: FacetOption[];
}

export type FacetParams = Pick<CatalogParams, "store" | "all" | "q"> &
  Partial<Pick<CatalogParams, "brand" | "line" | "col" | "mat">>;

type CountRow = { id: string | null; n: number };
const toMap = (rows: CountRow[]) => new Map<string | null, number>(rows.map((r) => [r.id, r.n]));

/**
 * Số SP cho từng lựa chọn của 5 bộ lọc (B3, B4).
 * - Mỗi bộ lọc được đếm với MỌI bộ lọc khác + tìm mã + phạm vi cửa hàng, bỏ chính nó
 *   (nên số đếm = số SP nhận được khi chỉ chọn lựa chọn đó trong bộ lọc ấy).
 * - Dòng và BST chỉ liệt kê giá trị thuộc các nhãn đang chọn (không chọn nhãn → mọi nhãn).
 * - BST luôn có lựa chọn "Không thuộc BST" (B6).
 * - Cửa hàng: số SP cửa hàng đó có đặt > 0 (đúng kết quả khi vừa chọn cửa hàng, chưa bật "xem tất cả").
 * Trả về cả lựa chọn có số đếm 0 để giao diện quyết định ẩn hay làm mờ.
 */
export async function getFacetCounts(params: FacetParams): Promise<FacetCounts> {
  const store = await findActiveStore(params.store);
  const filters: FilterInput = {
    q: params.q,
    brand: params.brand,
    line: params.line,
    col: params.col,
    mat: params.mat,
  };
  const scope = { store, all: params.all };
  const brandIds = params.brand ?? [];

  const countBy = (dim: GroupFilter, column: Prisma.Sql) =>
    prisma.$queryRaw<CountRow[]>`
        SELECT ${column}::text AS id, COUNT(*)::int AS n
        FROM product p ${visibleProductJoinsSql} ${qtyJoinSql(store)}
        WHERE ${Prisma.join(buildWhere(filters, { ...scope, omit: dim }), " AND ")}
        GROUP BY 1`.then(toMap);

  const storeCounts = prisma.$queryRaw<CountRow[]>`
      SELECT q.store_id::text AS id, COUNT(*)::int AS n
      FROM product p ${visibleProductJoinsSql}
      JOIN store_product_qty q ON q.product_id = p.id
      WHERE ${Prisma.join(buildWhere(filters, { ...scope, omit: "store" }), " AND ")}
        AND q.qty_ordered > 0
      GROUP BY 1`.then(toMap);

  const [brands, lines, cols, mats, stores, cBrand, cLine, cCol, cMat, cStore] = await Promise.all([
    prisma.brand.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.productLine.findMany({
      where: {
        active: true,
        brand: { active: true },
        ...(brandIds.length ? { brandId: { in: brandIds } } : {}),
      },
      select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.collection.findMany({
      where: {
        active: true,
        brand: { active: true },
        ...(brandIds.length ? { brandId: { in: brandIds } } : {}),
      },
      select: { id: true, name: true, brandId: true, brand: { select: { name: true } } },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.material.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.store.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    countBy("brand", Prisma.sql`p.brand_id`),
    countBy("line", Prisma.sql`p.product_line_id`),
    countBy("col", Prisma.sql`p.collection_id`),
    countBy("mat", Prisma.sql`p.material_id`),
    storeCounts,
  ]);

  return {
    brand: brands.map((o) => ({ id: o.id, name: o.name, count: cBrand.get(o.id) ?? 0 })),
    line: lines.map((o) => ({
      id: o.id,
      name: o.name,
      count: cLine.get(o.id) ?? 0,
      brandId: o.brandId,
      brandName: o.brand.name,
    })),
    col: [
      ...cols.map((o) => ({
        id: o.id,
        name: o.name,
        count: cCol.get(o.id) ?? 0,
        brandId: o.brandId,
        brandName: o.brand.name,
      })),
      { id: NO_COLLECTION, name: "Không thuộc BST", count: cCol.get(null) ?? 0 },
    ],
    mat: mats.map((o) => ({ id: o.id, name: o.name, count: cMat.get(o.id) ?? 0 })),
    store: stores.map((o) => ({ id: o.code, name: o.name, count: cStore.get(o.id) ?? 0 })),
  };
}
