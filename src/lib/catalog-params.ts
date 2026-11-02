/**
 * Tham số URL của trang xem (ARCHITECTURE §5.1):
 *   ?brand=a,b&line=…&col=…,none&mat=…&store=CH01&all=1&q=NTT&sort=…&view=grid|list&sp=NTT001
 * Giá trị lạ hoặc không hợp lệ bị bỏ, không gây lỗi (ARCHITECTURE §5.1, T04.9).
 * Id nhãn/dòng/BST/chất liệu là UUID; cửa hàng theo mã.
 */

export const SORTS = ["sku", "updated", "price_asc", "price_desc", "shortage"] as const;
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

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function list(v: string | string[] | undefined, accept: (s: string) => boolean): string[] {
  const parts = (Array.isArray(v) ? v : [v])
    .flatMap((s) => (s ?? "").split(","))
    .map((s) => s.trim())
    .filter((s) => s !== "" && accept(s));
  return [...new Set(parts)];
}

export function parseCatalogParams(raw: RawSearchParams): CatalogParams {
  const sort = first(raw.sort);
  const view = first(raw.view);
  const store = first(raw.store)?.trim();
  const sp = first(raw.sp)?.trim();
  const n = Number.parseInt(first(raw.n) ?? "", 10);
  return {
    brand: list(raw.brand, (s) => UUID.test(s)),
    line: list(raw.line, (s) => UUID.test(s)),
    col: list(raw.col, (s) => s === NO_COLLECTION || UUID.test(s)),
    mat: list(raw.mat, (s) => UUID.test(s)),
    store: store ? store : null,
    all: first(raw.all) === "1",
    q: (first(raw.q) ?? "").trim().slice(0, 100),
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "sku",
    view: view === "list" ? "list" : "grid",
    sp: sp ? sp : null,
    n: Number.isFinite(n) && n >= PAGE_SIZE ? Math.min(n, MAX_SHOWN) : PAGE_SIZE,
  };
}

/** Ghép lại thành chuỗi truy vấn; bỏ giá trị mặc định cho URL gọn. */
export function buildCatalogQuery(p: Partial<CatalogParams>): string {
  const u = new URLSearchParams();
  if (p.brand?.length) u.set("brand", p.brand.join(","));
  if (p.line?.length) u.set("line", p.line.join(","));
  if (p.col?.length) u.set("col", p.col.join(","));
  if (p.mat?.length) u.set("mat", p.mat.join(","));
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
