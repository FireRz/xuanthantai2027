import ExcelJS from "exceljs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { adminTemplate } from "@/server/services/export-admin";
import { previewImport } from "@/server/services/import";
import { applyImport } from "@/server/services/import-apply";
import { workbookBuffer } from "./excel-helpers";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seed() {
  const a = await prisma.brand.create({ data: { name: "Phúc Lộc" } });
  const b = await prisma.brand.create({ data: { name: "Kim Bảo" } });
  const nhan = await prisma.productLine.create({ data: { brandId: a.id, name: "Nhẫn" } });
  const lac = await prisma.productLine.create({ data: { brandId: b.id, name: "Lắc" } });
  const xuan = await prisma.collection.create({ data: { brandId: a.id, name: "Xuân 2027" } });
  const vang = await prisma.material.create({ data: { name: "Vàng 24K" } });
  const kg = await prisma.priceRange.create({ data: { name: "2tr < 5tr", sortOrder: 1 } });
  const s1 = await prisma.store.create({ data: { code: "CH01", name: "Một" } });
  const s2 = await prisma.store.create({ data: { code: "CH02", name: "Hai", active: false } });
  const full = await prisma.product.create({
    data: {
      sku: "AK0001",
      name: "Nhẫn A",
      brandId: a.id,
      productLineId: nhan.id,
      collectionId: xuan.id,
      materialId: vang.id,
      priceRangeId: kg.id,
      priceVnd: 38_100_000,
    },
  });
  const bare = await prisma.product.create({
    data: { sku: "00789", brandId: b.id, productLineId: lac.id },
  });
  const hidden = await prisma.product.create({
    data: { sku: "ZZ0009", brandId: a.id, productLineId: nhan.id, active: false },
  });
  await prisma.storeProductQty.createMany({
    data: [
      { productId: full.id, storeId: s1.id, qtyOrdered: 10, qtyReceived: 12 },
      { productId: full.id, storeId: s2.id, qtyOrdered: 3, qtyReceived: 0 },
      { productId: bare.id, storeId: s1.id, qtyOrdered: 0, qtyReceived: 0 },
      { productId: hidden.id, storeId: s1.id, qtyOrdered: 99, qtyReceived: 1 },
    ],
  });
}

async function snapshot() {
  const products = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  const qtys = await prisma.storeProductQty.findMany({
    orderBy: [{ productId: "asc" }, { storeId: "asc" }],
  });
  return { products, qtys };
}

describe("T11.4 — xuất quản trị", () => {
  it("chỉ SP đang hoạt động và mọi cặp có số liệu của chúng", async () => {
    await seed();
    const buf = await workbookBuffer(await adminTemplate());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const skus: string[] = [];
    wb.getWorksheet("SanPham")!.eachRow((r, n) => n > 1 && skus.push(String(r.getCell(1).value)));
    expect(skus).toEqual(["00789", "AK0001"]); // SP ẩn ZZ0009 không xuất; mã có số 0 đầu giữ nguyên chữ
    const pairs: string[] = [];
    wb.getWorksheet("SoLuong")!.eachRow(
      (r, n) =>
        n > 1 &&
        pairs.push(
          `${r.getCell(1).value}|${r.getCell(2).value}|${r.getCell(3).value}|${r.getCell(4).value}`,
        ),
    );
    expect(pairs).toEqual(["00789|CH01|0|0", "AK0001|CH01|10|12", "AK0001|CH02|3|0"]);
    const ak = wb.getWorksheet("SanPham")!.getRow(3);
    expect(ak.values).toEqual(
      expect.arrayContaining([
        "AK0001",
        "Nhẫn A",
        "Phúc Lộc",
        "Nhẫn",
        "Xuân 2027",
        "Vàng 24K",
        "2tr < 5tr",
        38_100_000,
      ]),
    );
  });

  it("AC3: xuất rồi nhập lại ngay → 0 lỗi, 0 thay đổi", async () => {
    await seed();
    const p = await previewImport(await workbookBuffer(await adminTemplate()));
    expect(p.issues).toEqual([]);
    expect(p.summary).toEqual({
      newProducts: 0,
      changedProducts: 0,
      unchangedProducts: 2,
      changedQuantities: 0,
      unchangedQuantities: 3,
      errors: 0,
    });
  });

  it("áp dụng file xuất không làm đổi dữ liệu (kể cả SP ẩn)", async () => {
    await seed();
    const before = await snapshot();
    const r = await applyImport(await workbookBuffer(await adminTemplate()));
    expect(r).toEqual({ newProducts: 0, updatedProducts: 0, quantityRows: 0 });
    expect(await snapshot()).toEqual(before);
  });

  it("sửa file xuất (đổi 1 SL, 1 giá) rồi nhập lại → đúng 2 thay đổi", async () => {
    await seed();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await workbookBuffer(await adminTemplate())) as unknown as ArrayBuffer);
    wb.getWorksheet("SoLuong")!.getRow(3).getCell(3).value = 11; // AK0001 / CH01 đặt 10 → 11
    wb.getWorksheet("SanPham")!.getRow(3).getCell(8).value = 40_000_000;
    const p = await previewImport(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(p.summary).toMatchObject({ errors: 0, changedProducts: 1, changedQuantities: 1 });
  });

  it("DB trống: xuất ra file mẫu nhập lại được", async () => {
    const p = await previewImport(await workbookBuffer(await adminTemplate()));
    expect(p.summary.errors).toBe(0);
  });

  it("nhiều hơn một lô (1.200 SP, nhiều dòng SL) vẫn đủ, đúng thứ tự, nhập lại sạch", async () => {
    const a = await prisma.brand.create({ data: { name: "Lô" } });
    const l = await prisma.productLine.create({ data: { brandId: a.id, name: "Dòng" } });
    const s = await prisma.store.create({ data: { code: "L1", name: "L" } });
    await prisma.product.createMany({
      data: Array.from({ length: 1200 }, (_, i) => ({
        sku: `P${String(i).padStart(5, "0")}`,
        brandId: a.id,
        productLineId: l.id,
      })),
    });
    const ids = await prisma.product.findMany({ select: { id: true } });
    await prisma.storeProductQty.createMany({
      data: ids.map((x, i) => ({ productId: x.id, storeId: s.id, qtyOrdered: i, qtyReceived: 0 })),
    });
    const p = await previewImport(await workbookBuffer(await adminTemplate()));
    expect(p.summary).toMatchObject({
      errors: 0,
      changedProducts: 0,
      changedQuantities: 0,
      unchangedProducts: 1200,
    });
  });
});
