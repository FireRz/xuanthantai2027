/** Định dạng số hiển thị (UI-DESIGN §1): `1.234`, `12.500.000 ₫`, `75%`; thiếu dữ liệu → "—". */

export const EMPTY = "—";

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return EMPTY;
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatVnd(n: number | null | undefined): string {
  if (n === null || n === undefined) return EMPTY;
  return `${formatInt(n)} ₫`;
}

/**
 * Tỷ lệ về (0..1) → "75%", "99,6%" (tối đa 1 chữ số thập phân, dấu phẩy kiểu Việt Nam).
 * Làm tròn xuống để chưa đủ hàng không bị hiện thành 100% (vd. 99,96% → 99,9%).
 * Đặt = 0 (null) → "—".
 */
export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return EMPTY;
  const tenths = Math.floor(rate * 1000 + 1e-9) / 10;
  return `${String(tenths).replace(".", ",")}%`;
}

/** Giá trị văn bản có thể trống → "—". */
export function orDash(s: string | null | undefined): string {
  return s && s.trim() !== "" ? s : EMPTY;
}
