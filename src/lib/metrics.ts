/**
 * Công thức Còn thiếu / Tỷ lệ về — ADR-007, BR-14, BR-15, ARCHITECTURE §4.3.
 * Dùng chung cho UI, import và export; view SQL `product_totals` cài cùng công thức.
 */

export interface QtyMetrics {
  ordered: number;
  received: number;
  /** max(Đặt − Về, 0) */
  shortage: number;
  /** min(Về / Đặt, 1); Đặt = 0 → null (hiển thị "—") */
  rate: number | null;
}

/** Số liệu của một cặp (SP, cửa hàng) hoặc của các số tổng đã cộng sẵn. */
export function computeMetrics(ordered: number, received: number): QtyMetrics {
  return {
    ordered,
    received,
    shortage: Math.max(ordered - received, 0),
    rate: ordered === 0 ? null : Math.min(received / ordered, 1),
  };
}

export interface StoreQty {
  ordered: number;
  received: number;
  /** Cửa hàng bị ẩn không cộng vào tổng (ARCHITECTURE §4.2). */
  storeActive: boolean;
}

/**
 * Số tổng của một SP: cộng Đặt, Về của các cửa hàng đang hiện rồi tính trên số tổng
 * (hàng dư ở cửa hàng này bù cho cửa hàng khác) — không cộng các "thiếu" riêng lẻ.
 */
export function totalMetrics(rows: readonly StoreQty[]): QtyMetrics {
  let ordered = 0;
  let received = 0;
  for (const r of rows) {
    if (!r.storeActive) continue;
    ordered += r.ordered;
    received += r.received;
  }
  return computeMetrics(ordered, received);
}

/** Tỷ lệ bán = Bán / (Bán + Tồn); chưa có Bán lẫn Tồn → null (hiển thị "—"). */
export function sellThrough(sold: number, stock: number): number | null {
  const base = sold + stock;
  return base === 0 ? null : sold / base;
}
