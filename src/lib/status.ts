import type { QtyMetrics } from "@/lib/metrics";

/** Trạng thái hàng về theo phạm vi đang xem — UI-DESIGN §4. */
export type StockStatus = "noorder" | "none" | "full" | "short";

export const STATUS_LABEL: Record<StockStatus, string> = {
  noorder: "Không đặt",
  none: "Chưa về",
  full: "Đủ hàng",
  short: "Còn thiếu",
};

/** Kiểm tra theo thứ tự: Đặt = 0 → Về = 0 → Thiếu = 0 → còn lại. */
export function stockStatus(m: Pick<QtyMetrics, "ordered" | "received" | "shortage">): StockStatus {
  if (m.ordered === 0) return "noorder";
  if (m.received === 0) return "none";
  if (m.shortage === 0) return "full";
  return "short";
}
