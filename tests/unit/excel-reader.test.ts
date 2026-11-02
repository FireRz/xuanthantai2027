import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { cellText, parseCount } from "@/lib/excel-values";
import { readWorkbook } from "@/server/import/read-workbook";

async function book(build: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("T08.6 — chuẩn hóa ô", () => {
  it("cắt khoảng trắng, ô trống → undefined", () => {
    expect(cellText("  NTT001 ")).toBe("NTT001");
    expect(cellText("   ")).toBeUndefined();
    expect(cellText("")).toBeUndefined();
    expect(cellText(null)).toBeUndefined();
    expect(cellText("  x ")).toBe("x");
  });

  it("số đọc dạng chữ; số lẻ bị đánh dấu để báo lỗi", () => {
    expect(cellText(12)).toBe("12");
    expect(cellText(0)).toBe("0");
    expect(cellText(1.5)).toContain("số lẻ");
    expect(cellText(true)).toBe("TRUE");
  });

  it("công thức, rich text, liên kết", () => {
    expect(cellText({ formula: "A1+1", result: 7 })).toBe("7");
    expect(cellText({ richText: [{ text: "Vàng " }, { text: "24K" }] })).toBe("Vàng 24K");
    expect(cellText({ text: "x", hyperlink: "http://a" })).toBe("x");
    expect(cellText({ error: "#N/A" })).toBe("#N/A");
  });

  it('"1.000" / " 12 " / "1,000" đọc đúng; số lẻ, âm, chữ → null', () => {
    expect(parseCount("1.000")).toBe(1000);
    expect(parseCount(" 12 ")).toBe(12);
    expect(parseCount("1,000")).toBe(1000);
    expect(parseCount("12.500.000")).toBe(12500000);
    expect(parseCount("0")).toBe(0);
    expect(parseCount("1.5")).toBeNull();
    expect(parseCount("1.50")).toBeNull();
    expect(parseCount("-3")).toBeNull();
    expect(parseCount("abc")).toBeNull();
    expect(parseCount("12 (số lẻ)")).toBeNull();
    expect(parseCount("99999999999999999999")).toBeNull();
  });
});

describe("T08.6 — bộ đọc workbook", () => {
  it("bỏ dòng trống, giữ số dòng Excel, ô trống = undefined, tiêu đề lệch hoa/thường", async () => {
    const buf = await book((wb) => {
      const sp = wb.addWorksheet("SanPham");
      sp.addRow(["MÃ sp", "Tên SP", "Nhãn  hàng", "Cột lạ"]);
      sp.addRow(["NTT001", "  Nhẫn A ", "Phúc Lộc", "x"]);
      sp.addRow([]);
      sp.addRow(["   ", null, ""]);
      sp.addRow(["NTT002", null, "Phúc Lộc"]);
      const sl = wb.addWorksheet("SoLuong");
      sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt", "SL đã về"]);
      sl.addRow(["NTT001", "CH01", 10, " 1.000 "]);
      sl.addRow(["NTT001", "CH02", null, 0]);
    });
    const r = await readWorkbook(buf);
    expect(r.products!.missingColumns).toEqual([]);
    expect(r.products!.rows).toEqual([
      { row: 2, cells: { sku: "NTT001", name: "Nhẫn A", brand: "Phúc Lộc" } },
      { row: 5, cells: { sku: "NTT002", brand: "Phúc Lộc" } },
    ]);
    expect(r.quantities!.rows).toEqual([
      { row: 2, cells: { sku: "NTT001", store: "CH01", ordered: "10", received: "1.000" } },
      { row: 3, cells: { sku: "NTT001", store: "CH02", received: "0" } },
    ]);
  });

  it("mã SP dạng số / có số 0 đầu giữ nguyên khi ô là chữ", async () => {
    const buf = await book((wb) => {
      const sp = wb.addWorksheet("SanPham");
      sp.addRow(["Mã SP"]);
      sp.addRow(["00123"]);
      sp.addRow([456]);
    });
    const r = await readWorkbook(buf);
    expect(r.products!.rows.map((x) => x.cells.sku)).toEqual(["00123", "456"]);
    expect(r.quantities).toBeNull();
  });

  it("thiếu cột bắt buộc → báo trong missingColumns; sheet khác tên bị bỏ qua", async () => {
    const buf = await book((wb) => {
      wb.addWorksheet("SanPham").addRow(["Tên SP"]);
      wb.addWorksheet("SoLuong").addRow(["Mã SP", "SL đặt"]);
      wb.addWorksheet("Sheet1").addRow(["gì đó"]);
    });
    const r = await readWorkbook(buf);
    expect(r.products!.missingColumns).toEqual(["Mã SP"]);
    expect(r.quantities!.missingColumns).toEqual(["Mã cửa hàng"]);
  });

  it("sheet trống chỉ có tiêu đề → 0 dòng", async () => {
    const buf = await book((wb) => {
      wb.addWorksheet("SanPham").addRow(["Mã SP", "Tên SP"]);
    });
    const r = await readWorkbook(buf);
    expect(r.products!.rows).toEqual([]);
  });
});
