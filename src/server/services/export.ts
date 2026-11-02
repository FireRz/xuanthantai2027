import { listProducts, type ProductListItem, type Scope } from "./catalog";
import type { CatalogParams } from "@/lib/catalog-params";

export interface ViewerExport {
  items: ProductListItem[];
  scope: Scope;
  /** Thời điểm xuất (ghi vào tiêu đề file). */
  exportedAt: Date;
}

/**
 * Danh sách SP để xuất cho người xem (F11): đúng bộ lọc, tìm kiếm, sắp xếp, phạm vi cửa hàng và
 * công tắc "Xem tất cả SP" như đang xem trên trang danh mục — dùng lại `listProducts`, không phân trang.
 */
export async function viewerList(
  params: Pick<CatalogParams, "store" | "all" | "q"> &
    Partial<Pick<CatalogParams, "brand" | "line" | "col" | "mat" | "pr" | "sort">>,
  now: Date = new Date(),
): Promise<ViewerExport> {
  const { items, scope } = await listProducts({ ...params, limit: null, offset: 0 });
  return { items, scope, exportedAt: now };
}
