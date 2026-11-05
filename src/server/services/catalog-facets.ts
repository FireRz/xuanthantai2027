import { Prisma } from "@prisma/client";
import { NO_COLLECTION, type CatalogParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { visibleProductJoinsSql } from "@/server/repositories/visibility";
import {
  buildWhere,
  findScope,
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
  /** Chủng loại. */
  typ: FacetOption[];
  /** Khung giá, theo thứ tự khoảng giá (ADR-010). */
  pr: FacetOption[];
  store: FacetOption[];
  /** Số SP khớp mọi bộ lọc đang áp dụng (cho nút "Xem N SP"). */
  total: number;
  /** Số SP khi bỏ riêng bộ lọc chủng loại — số trên chip "Tất cả". */
  typTotal: number;
  /** Phạm vi số liệu thực tế sau khi đối chiếu URL (cửa hàng/khu vực không có thì "total"). */
  scope: "total" | "store" | "region";
}

export type FacetParams = Pick<CatalogParams, "store" | "all" | "q"> &
  Partial<Pick<CatalogParams, "kv" | "brand" | "line" | "col" | "mat" | "typ" | "pr">>;

type CountRow = { id: string | null; n: number };
const toMap = (rows: CountRow[]) => new Map<string | null, number>(rows.map((r) => [r.id, r.n]));

/**
 * Số SP cho từng lựa chọn của 6 bộ lọc (B3, B4).
 * - Mỗi bộ lọc được đếm với MỌI bộ lọc khác + tìm mã + phạm vi cửa hàng, bỏ chính nó
 *   (nên số đếm = số SP nhận được khi chỉ chọn lựa chọn đó trong bộ lọc ấy).
 * - Dòng và BST chỉ liệt kê giá trị thuộc các nhãn đang chọn (không chọn nhãn → mọi nhãn).
 * - BST luôn có lựa chọn "Không thuộc BST" (B6).
 * - Cửa hàng: số SP cửa hàng đó có đặt > 0 (đúng kết quả khi vừa chọn cửa hàng, chưa bật "xem tất cả").
 * Trả về cả lựa chọn có số đếm 0 để giao diện quyết định ẩn hay làm mờ.
 */
export async function getFacetCounts(params: FacetParams): Promise<FacetCounts> {
  const store = await findScope(params);
  const filters: FilterInput = {
    q: params.q,
    brand: params.brand,
    line: params.line,
    col: params.col,
    mat: params.mat,
    typ: params.typ,
    pr: params.pr,
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

  const totalCount = prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM product p ${visibleProductJoinsSql} ${qtyJoinSql(store)}
      WHERE ${Prisma.join(buildWhere(filters, scope), " AND ")}`.then((r) => r[0]?.n ?? 0);

  const typTotalCount = prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM product p ${visibleProductJoinsSql} ${qtyJoinSql(store)}
      WHERE ${Prisma.join(buildWhere(filters, { ...scope, omit: "typ" }), " AND ")}`.then(
    (r) => r[0]?.n ?? 0,
  );

  const [
    brands,
    lines,
    cols,
    mats,
    stores,
    cBrand,
    cLine,
    cCol,
    cMat,
    cStore,
    total,
    ranges,
    cPr,
    types,
    cTyp,
  ] = await Promise.all([
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
    totalCount,
    prisma.priceRange.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    countBy("pr", Prisma.sql`p.price_range_id`),
    prisma.productType.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    countBy("typ", Prisma.sql`p.product_type_id`),
  ]);
  const typTotal = await typTotalCount;

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
      { id: NO_COLLECTION, name: "Không thuộc BST", count: cCol.get(null) ?? 0 },
      ...cols.map((o) => ({
        id: o.id,
        name: o.name,
        count: cCol.get(o.id) ?? 0,
        brandId: o.brandId,
        brandName: o.brand.name,
      })),
    ],
    mat: mats.map((o) => ({ id: o.id, name: o.name, count: cMat.get(o.id) ?? 0 })),
    typ: types.map((o) => ({ id: o.id, name: o.name, count: cTyp.get(o.id) ?? 0 })),
    pr: ranges.map((o) => ({ id: o.id, name: o.name, count: cPr.get(o.id) ?? 0 })),
    store: stores.map((o) => ({ id: o.code, name: o.name, count: cStore.get(o.id) ?? 0 })),
    total,
    typTotal,
    scope: store?.kind ?? "total",
  };
}
