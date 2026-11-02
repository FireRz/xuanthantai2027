/** Chuẩn hóa giá trị ô Excel và đọc số từ chữ — thuần, dùng chung cho bộ đọc và bước kiểm tra. */

type Rich = { richText: { text: string }[] };
type Formula = { formula?: string; sharedFormula?: string; result?: unknown };
type Link = { text: unknown; hyperlink: string };
type ErrorValue = { error: string };

/**
 * Giá trị ô → chuỗi đã bỏ khoảng trắng đầu/cuối; ô trống → undefined (nghĩa là "giữ nguyên", R6).
 * Số được đọc thành chữ để mã như "00123" hay "1.000" không bị Excel làm méo; số lẻ được đánh dấu
 * để bước kiểm tra báo lỗi thay vì đoán ý người nhập.
 */
export function cellText(value: unknown): string | undefined {
  const t = rawText(value);
  if (t === undefined) return undefined;
  const s = t.replace(/[ ​﻿]/g, " ").trim();
  return s === "" ? undefined : s;
}

function rawText(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  switch (typeof v) {
    case "string":
      return v;
    case "number":
      return Number.isInteger(v) ? String(v) : `${v} (số lẻ)`;
    case "boolean":
      return v ? "TRUE" : "FALSE";
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as Partial<Rich & Formula & Link & ErrorValue>;
  if (Array.isArray(o.richText)) return o.richText.map((r) => r.text).join("");
  if ("result" in o) return rawText(o.result);
  if (o.error !== undefined) return o.error;
  if (o.hyperlink !== undefined) return rawText(o.text);
  return undefined;
}

/**
 * Số nguyên không âm từ chữ: "12", " 12 ", "1.000" hoặc "1,000" (dấu phân cách hàng nghìn kiểu VN/Anh).
 * Trả null nếu không phải số nguyên ≥ 0 (số lẻ, chữ, số âm...).
 */
export function parseCount(text: string): number | null {
  const s = text.trim();
  const plain = /^\d+$/.test(s)
    ? s
    : /^\d{1,3}([.,]\d{3})+$/.test(s)
      ? s.replace(/[.,]/g, "")
      : null;
  if (plain === null) return null;
  const n = Number(plain);
  return Number.isSafeInteger(n) ? n : null;
}
