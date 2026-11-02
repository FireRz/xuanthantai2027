import ExcelJS from "exceljs";
import JSZip from "jszip";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { templateData } from "@/server/services/export-admin";
import { PRODUCT_COLUMNS, QUANTITY_COLUMNS } from "@/lib/excel-template";
import { workbookBuffer } from "./excel-helpers";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedCatalog() {
  const a = await prisma.brand.create({ data: { name: "Phúc Lộc" } });
  await prisma.brand.create({ data: { name: "Đã ẩn", active: false } });
  await prisma.productLine.create({ data: { brandId: a.id, name: "Nhẫn" } });
  await prisma.collection.create({ data: { brandId: a.id, name: "Xuân 2027" } });
  await prisma.material.create({ data: { name: "Vàng 24K" } });
  await prisma.priceRange.createMany({
    data: [
      { name: "2tr < 5tr", sortOrder: 2 },
      { name: "< 1tr", sortOrder: 1 },
    ],
  });
  await prisma.store.create({ data: { code: "CH02", name: "Hai" } });
  await prisma.store.create({ data: { code: "CH01", name: "Một" } });
}

describe("T08.5 — file mẫu Excel", () => {
  it("có 3 sheet hiển thị + sheet danh mục ẩn, đúng cột", async () => {
    await seedCatalog();
    const buf = await workbookBuffer(await templateData());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["SanPham", "SoLuong", "HuongDan", "DanhMuc"]);
    expect(wb.getWorksheet("DanhMuc")!.state).toBe("hidden");
    const header = (n: string) =>
      (wb.getWorksheet(n)!.getRow(1).values as string[]).slice(1).map(String);
    expect(header("SanPham")).toEqual(PRODUCT_COLUMNS.map((c) => c.header));
    expect(header("SoLuong")).toEqual(QUANTITY_COLUMNS.map((c) => c.header));
    // Không có dòng dữ liệu
    expect(wb.getWorksheet("SanPham")!.rowCount).toBe(1);
    expect(wb.getWorksheet("SoLuong")!.rowCount).toBe(1);
    // Hướng dẫn có nội dung quy tắc
    const guide: string[] = [];
    wb.getWorksheet("HuongDan")!.eachRow((r) => guide.push(String(r.getCell(1).value ?? "")));
    expect(guide.join("\n")).toContain("GHI ĐÈ");
    expect(guide.join("\n")).toContain("TRỐNG");
  });

  it("danh sách chọn khớp dữ liệu trên web (AC1): chỉ mục đang hoạt động, khung giá theo thứ tự", async () => {
    await seedCatalog();
    const data = await templateData();
    expect(data.lists).toEqual({
      brand: ["Phúc Lộc"],
      line: ["Nhẫn"],
      collection: ["Xuân 2027"],
      material: ["Vàng 24K"],
      priceRange: ["< 1tr", "2tr < 5tr"],
      store: ["CH01", "CH02"],
    });
    const buf = await workbookBuffer(data);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const dm = wb.getWorksheet("DanhMuc")!;
    expect(dm.getColumn(5).values).toContain("2tr < 5tr");
    expect(dm.getRow(2).getCell(6).value).toBe("CH01");
  });

  it("ô chọn (data validation) trỏ đúng vào sheet danh mục ở các cột cần thiết", async () => {
    await seedCatalog();
    const zip = await JSZip.loadAsync(await workbookBuffer(await templateData()));
    const sp = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    const sl = await zip.file("xl/worksheets/sheet2.xml")!.async("string");
    const rules = (xml: string) => [
      ...xml.matchAll(/<dataValidation [^>]*sqref="([^"]+)"[\s\S]*?<formula1>([^<]+)</g),
    ];
    const spRules = rules(sp).map((m) => [m[1], m[2]]);
    expect(spRules.map((r) => r[0].replace(/\d+$/, "").replace(/:[A-Z]/, ":"))).toEqual(
      expect.arrayContaining(["C2:", "D2:", "E2:", "F2:", "G2:"]),
    );
    expect(spRules.find((r) => r[0].startsWith("C2"))![1]).toBe("DanhMuc!$A$2:$A$2");
    expect(spRules.find((r) => r[0].startsWith("G2"))![1]).toBe("DanhMuc!$E$2:$E$3");
    const slRules = rules(sl).map((m) => [m[1], m[2]]);
    expect(slRules).toHaveLength(1);
    expect(slRules[0][0].startsWith("B2")).toBe(true);
    expect(slRules[0][1]).toBe("DanhMuc!$F$2:$F$3");
  });

  it("DB trống: vẫn tạo được file mẫu (không có ô chọn)", async () => {
    const buf = await workbookBuffer(await templateData());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.getWorksheet("SanPham")).toBeDefined();
  });
});
