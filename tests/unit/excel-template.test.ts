import { describe, expect, it } from "vitest";
import {
  LIST_COLUMNS,
  PRODUCT_COLUMNS,
  QUANTITY_COLUMNS,
  SHEET_GUIDE,
  SHEET_PRODUCTS,
  SHEET_QUANTITIES,
  headerMap,
  normalizeCode,
  normalizeText,
} from "@/lib/excel-template";

describe("T08.3 — định nghĩa mẫu Excel", () => {
  it("tên sheet", () => {
    expect([SHEET_PRODUCTS, SHEET_QUANTITIES, SHEET_GUIDE]).toEqual([
      "SanPham",
      "SoLuong",
      "HuongDan",
    ]);
  });

  it("sheet SanPham: đúng tên cột và thứ tự (ADR-006 + Khung giá ADR-010)", () => {
    expect(PRODUCT_COLUMNS.map((c) => c.header)).toEqual([
      "Mã SP",
      "Tên SP",
      "Nhãn hàng",
      "Dòng hàng",
      "Bộ sưu tập",
      "Tuổi vàng",
      "Khung giá",
      "Giá bán lẻ",
    ]);
  });

  it("sheet SoLuong: đúng tên cột và thứ tự, mỗi cửa hàng một dòng", () => {
    expect(QUANTITY_COLUMNS.map((c) => c.header)).toEqual([
      "Mã SP",
      "Mã cửa hàng",
      "SL đặt",
      "SL đã về",
    ]);
  });

  it("khóa cột không trùng, cột bắt buộc là Mã SP (và Mã cửa hàng)", () => {
    for (const cols of [PRODUCT_COLUMNS, QUANTITY_COLUMNS]) {
      expect(new Set(cols.map((c) => c.key)).size).toBe(cols.length);
    }
    expect(PRODUCT_COLUMNS.filter((c) => c.requiredColumn).map((c) => c.key)).toEqual(["sku"]);
    expect(QUANTITY_COLUMNS.filter((c) => c.requiredColumn).map((c) => c.key)).toEqual([
      "sku",
      "store",
    ]);
  });

  it("danh sách chọn: nhãn, dòng, BST, tuổi vàng, khung giá, mã cửa hàng", () => {
    expect(LIST_COLUMNS.map((c) => c.key)).toEqual([
      "brand",
      "line",
      "collection",
      "material",
      "priceRange",
      "store",
    ]);
  });

  it("R15: so khớp không phân biệt hoa/thường và khoảng trắng thừa", () => {
    expect(normalizeText("  Nhẫn   VÀNG ")).toBe(normalizeText("nhẫn vàng"));
    expect(normalizeText("Nhẫn".normalize("NFD"))).toBe(normalizeText("Nhẫn"));
    expect(normalizeCode(" ntt001 ")).toBe("NTT001");
  });

  it("headerMap nhận tiêu đề lệch hoa/thường và khoảng trắng", () => {
    const m = headerMap(PRODUCT_COLUMNS);
    expect(m.get(normalizeText("  mã sp "))).toBe("sku");
    expect(m.get(normalizeText("GIÁ BÁN  LẺ"))).toBe("price");
    expect(m.get("không có")).toBeUndefined();
  });
});
