import type { CatalogParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { catalogFromSql } from "./catalog";
import { findScope, orderBySql } from "./catalog-filter";

export interface ProductNeighbors {
  prev: string | null;
  next: string | null;
  /** Ảnh gốc (image_url ?? thumb_url) của SP trước/sau — để tải trước. */
  prevImage: string | null;
  nextImage: string | null;
  position: number;
  total: number;
}

type Row = {
  prev: string | null;
  next: string | null;
  prev_image: string | null;
  next_image: string | null;
  pos: bigint;
  total: bigint;
};

/**
 * SP trước/sau của `sku` trong popup = đúng thứ tự danh sách đang xem (cùng bộ lọc, tìm mã,
 * cửa hàng, "Xem tất cả SP", sắp xếp), không phụ thuộc số SP đã tải ("Xem thêm").
 * `sku` không nằm trong danh sách đang lọc (hoặc không tồn tại/bị ẩn) → null. `position` bắt đầu từ 1.
 */
export async function getProductNeighbors(
  params: CatalogParams,
  sku: string,
): Promise<ProductNeighbors | null> {
  const code = sku.trim();
  if (!code) return null;
  const store = await findScope(params);
  const order = orderBySql(params.sort);
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT prev, next, prev_image, next_image, pos, total FROM (
      SELECT p.sku,
             LAG(p.sku) OVER (ORDER BY ${order}) AS prev,
             LEAD(p.sku) OVER (ORDER BY ${order}) AS next,
             LAG(COALESCE(p.image_url, p.thumb_url)) OVER (ORDER BY ${order}) AS prev_image,
             LEAD(COALESCE(p.image_url, p.thumb_url)) OVER (ORDER BY ${order}) AS next_image,
             ROW_NUMBER() OVER (ORDER BY ${order}) AS pos,
             COUNT(*) OVER () AS total
      ${catalogFromSql(params, store)}
    ) t WHERE upper(t.sku) = upper(${code})`;
  const r = rows[0];
  if (!r) return null;
  return {
    prev: r.prev,
    next: r.next,
    prevImage: r.prev_image,
    nextImage: r.next_image,
    position: Number(r.pos),
    total: Number(r.total),
  };
}
