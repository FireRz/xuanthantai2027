/**
 * Tham số URL của trang xem (ARCHITECTURE §5.1):
 *   ?brand=a,b&line=…&col=…,none&mat=…&typ=…&pr=…&store=CH01&all=1&q=NTT&sort=…&view=grid|list&sp=NTT001
 * Giá trị lạ hoặc không hợp lệ bị bỏ, không gây lỗi (ARCHITECTURE §5.1, T04.9).
 * Id nhãn/dòng/BST/tuổi vàng là UUID; cửa hàng theo mã.
 */
import { z } from "zod";

export const SORTS = ["sku", "updated", "price_asc", "price_desc", "shortage", "sold"] as const;
export type Sort = (typeof SORTS)[number];
export const VIEWS = ["grid", "list"] as const;
export type View = (typeof VIEWS)[number];

/** Giá trị đặc biệt của bộ lọc BST: SP không thuộc BST nào. */
export const NO_COLLECTION = "none";
/** Số SP mỗi lần tải (T03.5). */
export const PAGE_SIZE = 24;
const MAX_SHOWN = 3000;

export interface CatalogParams {
  brand: string[];
  line: string[];
  /** Id BST hoặc NO_COLLECTION. */
  col: string[];
  mat: string[];
  /** Id chủng loại. */
  typ: string[];
  /** Id khung giá (ADR-010). */
  pr: string[];
  store: string | null;
  /** Công tắc "Xem tất cả SP" khi đã chọn cửa hàng (ADR-002 D6). */
  all: boolean;
  q: string;
  sort: Sort;
  view: View;
  sp: string | null;
  /** Số SP đang hiển thị (tải thêm tăng dần). */
  n: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isId = (s: string) => UUID.test(s);

const rawString = z.union([z.string(), z.array(z.string())]).optional();
/** Tham số lặp (?a=1&a=2) lấy giá trị đầu. */
const single = rawString.transform((v) => (Array.isArray(v) ? v[0] : v));

/** Danh sách phân tách bằng dấu phẩy: bỏ rỗng, bỏ trùng, bỏ giá trị không qua `accept`. */
const listOf = (accept: (s: string) => boolean) =>
  rawString.transform((v) => {
    const parts = (Array.isArray(v) ? v : [v])
      .flatMap((s) => (s ?? "").split(","))
      .map((s) => s.trim())
      .filter((s) => s !== "" && accept(s));
    return [...new Set(parts)];
  });

const schema = z.object({
  brand: listOf(isId),
  line: listOf(isId),
  col: listOf((s) => s === NO_COLLECTION || isId(s)),
  mat: listOf(isId),
  typ: listOf(isId),
  pr: listOf(isId),
  store: single.transform((v) => v?.trim() || null),
  all: single.transform((v) => v === "1"),
  q: single.transform((v) => (v ?? "").trim().slice(0, 100)),
  sort: single.transform((v): Sort => (SORTS.includes(v as Sort) ? (v as Sort) : "sku")),
  view: single.transform((v): View => (v === "list" ? "list" : "grid")),
  sp: single.transform((v) => v?.trim() || null),
  n: single.transform((v) => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) && n >= PAGE_SIZE ? Math.min(n, MAX_SHOWN) : PAGE_SIZE;
  }),
});

/** Đọc tham số URL (Zod); giá trị không hợp lệ bị bỏ, không bao giờ ném lỗi. */
export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  return schema.parse(raw);
}

/** Ghép lại thành chuỗi truy vấn; bỏ giá trị mặc định cho URL gọn. */
export function buildCatalogQuery(p: Partial<CatalogParams>): string {
  const u = new URLSearchParams();
  if (p.brand?.length) u.set("brand", p.brand.join(","));
  if (p.line?.length) u.set("line", p.line.join(","));
  if (p.col?.length) u.set("col", p.col.join(","));
  if (p.mat?.length) u.set("mat", p.mat.join(","));
  if (p.typ?.length) u.set("typ", p.typ.join(","));
  if (p.pr?.length) u.set("pr", p.pr.join(","));
  if (p.store) u.set("store", p.store);
  if (p.store && p.all) u.set("all", "1");
  if (p.q) u.set("q", p.q);
  if (p.sort && p.sort !== "sku") u.set("sort", p.sort);
  if (p.view === "list") u.set("view", "list");
  if (p.sp) u.set("sp", p.sp);
  if (p.n && p.n > PAGE_SIZE) u.set("n", String(p.n));
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Số bộ lọc nhóm (nhãn, dòng, BST, tuổi vàng, chủng loại, khung giá) đang chọn — để hiện trên nút "Lọc (n)". */
export function countGroupFilters(
  p: Pick<CatalogParams, "brand" | "line" | "col" | "mat" | "typ" | "pr">,
) {
  return p.brand.length + p.line.length + p.col.length + p.mat.length + p.typ.length + p.pr.length;
}

/** Có bộ lọc/tìm kiếm/cửa hàng nào đang áp dụng không (để hiện "Xóa lọc"). */
export function hasActiveFilter(p: CatalogParams) {
  return Boolean(p.store || p.q || countGroupFilters(p) > 0);
}

/** Dòng/BST thuộc nhãn nào — dùng để bỏ lựa chọn không còn hợp lệ khi đổi nhãn (B3, T04.9). */
export interface OwnedOption {
  id: string;
  brandId: string;
}

/**
 * Đổi nhãn thì bỏ dòng/BST không thuộc các nhãn đang chọn (không chọn nhãn nào = không ràng buộc).
 * "Không thuộc BST" luôn được giữ. Id không biết (đã ẩn/xóa) cũng bị bỏ.
 */
export function pruneInvalidSelections<T extends Pick<CatalogParams, "brand" | "line" | "col">>(
  p: T,
  lines: OwnedOption[],
  collections: OwnedOption[],
): T {
  if (p.brand.length === 0) {
    const knownLine = new Set(lines.map((o) => o.id));
    const knownCol = new Set(collections.map((o) => o.id));
    return {
      ...p,
      line: p.line.filter((id) => knownLine.has(id)),
      col: p.col.filter((id) => id === NO_COLLECTION || knownCol.has(id)),
    };
  }
  const brands = new Set(p.brand);
  const okLine = new Set(lines.filter((o) => brands.has(o.brandId)).map((o) => o.id));
  const okCol = new Set(collections.filter((o) => brands.has(o.brandId)).map((o) => o.id));
  return {
    ...p,
    line: p.line.filter((id) => okLine.has(id)),
    col: p.col.filter((id) => id === NO_COLLECTION || okCol.has(id)),
  };
}
