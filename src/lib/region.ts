/** Khu vực (ASM) của cửa hàng: gõ tự do ở trang quản trị, ví dụ "1", "2". */

/** Tên hiển thị: chỉ là số → "Khu vực 1"; còn lại giữ nguyên chữ đã nhập. */
export function regionLabel(region: string): string {
  return /^\d+$/.test(region.trim()) ? `Khu vực ${region.trim()}` : region;
}

/** So khớp khu vực không phân biệt hoa/thường và khoảng trắng hai đầu. */
export const sameRegion = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLocaleLowerCase("vi") === b.trim().toLocaleLowerCase("vi");

/** Danh sách khu vực (không trùng) theo thứ tự tự nhiên: 1, 2, …, 10, rồi chữ. */
export function sortRegions(regions: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const r of regions) {
    const v = r?.trim();
    if (v && !seen.has(v.toLocaleLowerCase("vi"))) seen.set(v.toLocaleLowerCase("vi"), v);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
}
