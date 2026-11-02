import ExcelJS from "exceljs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { previewImport } from "@/server/services/import";
import { templateData } from "@/server/services/export-admin";
import { workbookBuffer } from "./excel-helpers";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seed() {
  const brand = await prisma.brand.create({ data: { name: "Phúc Lộc" } });
  const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
  const col = await prisma.collection.create({ data: { brandId: brand.id, name: "Xuân 2027" } });
  const mat = await prisma.material.create({ data: { name: "Vàng 24K" } });
  const s1 = await prisma.store.create({ data: { code: "CH01", name: "Một" } });
  await prisma.store.create({ data: { code: "CH02", name: "Hai" } });
  const p = await prisma.product.create({
    data: {
      sku: "AK0001",
      name: "Nhẫn A",
      brandId: brand.id,
      productLineId: line.id,
      collectionId: col.id,
      materialId: mat.id,
      priceVnd: 38_100_000,
    },
  });
  await prisma.storeProductQty.create({
    data: { productId: p.id, storeId: s1.id, qtyOrdered: 10, qtyReceived: 2 },
  });
  return { brand, line, p, s1 };
}

async function xlsx(build: (wb: ExcelJS.Workbook) => void) {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("T08.5/T08.7 — xem trước với dữ liệu thật", () => {
  it("nhập lại file mẫu trống: không lỗi, không thay đổi", async () => {
    await seed();
    const p = await previewImport(await workbookBuffer(await templateData()));
    expect(p.summary).toEqual({
      newProducts: 0,
      changedProducts: 0,
      unchangedProducts: 0,
      changedQuantities: 0,
      unchangedQuantities: 0,
      errors: 0,
    });
    expect(p.sheets).toEqual({ products: true, quantities: true });
  });

  it("AC2/AC4: đặt 10 → 15 ghi đè, SP mới, giá đổi; kèm giá trị cũ → mới", async () => {
    await seed();
    const buf = await xlsx((wb) => {
      const sp = wb.addWorksheet("SanPham");
      sp.addRow(["Mã SP", "Tên SP", "Nhãn hàng", "Dòng hàng", "Giá bán lẻ"]);
      sp.addRow(["AK0001", null, null, null, 39_000_000]);
      sp.addRow(["MOI01", "Mới", "phúc lộc", "nhẫn", null]);
      const sl = wb.addWorksheet("SoLuong");
      sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt", "SL đã về"]);
      sl.addRow(["AK0001", "CH01", 15, null]);
      sl.addRow(["MOI01", "CH02", 4, 1]);
    });
    const p = await previewImport(buf);
    expect(p.summary).toMatchObject({
      newProducts: 1,
      changedProducts: 1,
      changedQuantities: 2,
      errors: 0,
    });
    expect(p.quantityItems.find((q) => q.sku === "AK0001")).toMatchObject({
      old: { ordered: 10, received: 2 },
      new: { ordered: 15, received: 2 },
    });
    expect(p.productItems.find((i) => i.sku === "AK0001")!.changes).toEqual([
      { column: "Giá bán lẻ", old: "38.100.000", new: "39.000.000" },
    ]);
    // Xem trước KHÔNG ghi gì
    expect(await prisma.product.count()).toBe(1);
    expect((await prisma.storeProductQty.findFirstOrThrow()).qtyOrdered).toBe(10);
  });

  it("AC5: file có lỗi → mỗi lỗi ghi sheet, dòng, cột, lý do", async () => {
    await seed();
    const buf = await xlsx((wb) => {
      const sp = wb.addWorksheet("SanPham");
      sp.addRow(["Mã SP", "Nhãn hàng", "Dòng hàng", "Bộ sưu tập"]);
      sp.addRow(["AK0001", null, null, "Xuân 2028"]);
      const sl = wb.addWorksheet("SoLuong");
      sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt"]);
      sl.addRow(["AK0001", "CH99", 1]);
    });
    const p = await previewImport(buf);
    expect(p.issues.map((i) => `${i.sheet} dòng ${i.row}: ${i.column} — ${i.reason}`)).toEqual([
      'SanPham dòng 2: Bộ sưu tập — Bộ sưu tập "Xuân 2028" chưa có trong nhãn Phúc Lộc',
      'SoLuong dòng 2: Mã cửa hàng — Mã cửa hàng "CH99" chưa có trên web',
    ]);
  });

  it("file không phải mẫu (sheet khác tên) → lỗi cấp file", async () => {
    const buf = await xlsx((wb) => wb.addWorksheet("Sheet1").addRow(["x"]));
    const p = await previewImport(buf);
    expect(p.issues[0]).toMatchObject({ sheet: "File", row: 0 });
  });

  it("danh sách chi tiết bị cắt nhưng tổng vẫn đủ", async () => {
    const { toPreview, analyzeFile } = await import("@/server/services/import");
    await seed();
    const buf = await xlsx((wb) => {
      const sl = wb.addWorksheet("SoLuong");
      sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt"]);
      for (let i = 0; i < 5; i++) sl.addRow(["KHONGCO" + i, "CH01", 1]);
    });
    const a = await analyzeFile(buf);
    const p = toPreview(a, 2);
    expect(p.summary.errors).toBe(5);
    expect(p.issues).toHaveLength(2);
    expect(p.truncated.issues).toBe(true);
  });
});
