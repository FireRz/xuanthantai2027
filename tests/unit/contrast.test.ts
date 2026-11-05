import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// T03.9 — chữ trên nền phải đạt WCAG AA (UI-DESIGN §2): 4,5 cho chữ thường, 3 cho chữ lớn.
const css = readFileSync("src/app/globals.css", "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}: *(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Thiếu token --color-${name}`);
  return m[1];
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
  const [hi, lo] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("T03.9 — tương phản AA của bảng màu", () => {
  const normal: [string, string][] = [
    ["ink", "cream"],
    ["ink-muted", "cream"],
    ["ink-muted", "gold-soft"],
    ["brand", "cream"], // liên kết, viền focus
    ["gold-fg", "gold"], // chữ nâu trên nút vàng
    ["festive-text", "brand"], // chữ nhỏ kem trên header đỏ
    ["festive-text", "brand-dark"], // chân trang, đầu trang Phân tích
    ["status-full-fg", "status-full-soft"],
    ["status-short-fg", "status-short-soft"],
    ["status-none-fg", "status-none-soft"],
    ["status-noorder-fg", "status-noorder-soft"],
  ];
  it.each(normal)("%s trên %s ≥ 4,5", (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("chữ lớn vàng trên đỏ ≥ 3 (chỉ dùng cho chữ ≥ 24px)", () => {
    expect(ratio("gold", "brand")).toBeGreaterThanOrEqual(3);
  });
});
