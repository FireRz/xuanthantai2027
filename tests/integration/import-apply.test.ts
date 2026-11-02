import ExcelJS from "exceljs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { applyImport } from "@/server/services/import-apply";
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
  const s2 = await prisma.store.create({ data: { code: "CH02", name: "Hai" } });
  const p = await prisma.product.create({
    data: {
      sku: "AK0001",
      name: "Nhẫn A",
      brandId: a.id,
      productLineId: nhan.id,
      collectionId: xuan.id,
      priceVnd: 38_100_000,
    },
  });
  await prisma.storeProductQty.create({
    data: { productId: p.id, storeId: s1.id, qtyOrdered: 10, qtyReceived: 2 },
  });
  return { a, b, nhan, lac, xuan, vang, kg, s1, s2, p };
}

async function xlsx(build: (wb: ExcelJS.Workbook) => void) {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const file = (products: (string | number | null)[][], quantities: (string | number | null)[][]) =>
  xlsx((wb) => {
    const sp = wb.addWorksheet("SanPham");
    sp.addRow([
      "Mã SP",
      "Tên SP",
      "Nhãn hàng",
      "Dòng hàng",
      "Bộ sưu tập",
      "Chất liệu",
      "Khung giá",
      "Giá bán lẻ",
    ]);
    products.forEach((r) => sp.addRow(r));
    const sl = wb.addWorksheet("SoLuong");
    sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt", "SL đã về"]);
    quantities.forEach((r) => sl.addRow(r));
  });

describe("T08.9 — áp dụng trong một transaction", () => {
  it("tạo SP mới, cập nhật SP đổi, ghi đè SL; ô trống giữ nguyên (AC2, AC3)", async () => {
    const t = await seed();
    const buf = await file(
      [
        ["AK0001", null, null, null, null, "Vàng 24K", "2tr < 5tr", 39_000_000],
        ["MOI01", "Lắc mới", "Kim Bảo", "Lắc", null, null, null, null],
      ],
      [
        ["AK0001", "CH01", 15, null],
        ["AK0001", "CH02", null, 3],
        ["MOI01", "CH02", 4, 1],
      ],
    );
    const r = await applyImport(buf);
    expect(r).toEqual({ newProducts: 1, updatedProducts: 1, quantityRows: 3 });

    const ak = await prisma.product.findUniqueOrThrow({ where: { sku: "AK0001" } });
    expect(ak).toMatchObject({
      name: "Nhẫn A", // ô trống giữ nguyên
      collectionId: t.xuan.id, // ô trống giữ nguyên
      materialId: t.vang.id,
      priceRangeId: t.kg.id,
      priceVnd: 39_000_000,
    });
    const q = (sku: string, storeId: string) =>
      prisma.storeProductQty.findFirstOrThrow({ where: { product: { sku }, storeId } });
    expect(await q("AK0001", t.s1.id)).toMatchObject({ qtyOrdered: 15, qtyReceived: 2 });
    expect(await q("AK0001", t.s2.id)).toMatchObject({ qtyOrdered: 0, qtyReceived: 3 });
    const moi = await prisma.product.findUniqueOrThrow({ where: { sku: "MOI01" } });
    expect(moi).toMatchObject({
      name: "Lắc mới",
      brandId: t.b.id,
      productLineId: t.lac.id,
      collectionId: null,
      active: true,
    });
    expect(await q("MOI01", t.s2.id)).toMatchObject({ qtyOrdered: 4, qtyReceived: 1 });
  });

  it("SL về > SL đặt được ghi (R4); nhập lại cùng file lần hai → không thay đổi gì", async () => {
    const t = await seed();
    const buf = await file([], [["AK0001", "CH02", 3, 9]]);
    await applyImport(buf);
    expect(
      await prisma.storeProductQty.findFirstOrThrow({ where: { storeId: t.s2.id } }),
    ).toMatchObject({ qtyOrdered: 3, qtyReceived: 9 });
    const again = await applyImport(buf);
    expect(again).toEqual({ newProducts: 0, updatedProducts: 0, quantityRows: 0 });
  });

  it("còn lỗi → từ chối, không ghi gì (R14, AC6)", async () => {
    await seed();
    const buf = await file(
      [["MOI01", null, "Kim Bảo", "Lắc", null, null, null, null]],
      [["AK0001", "CH99", 1, 1]],
    );
    await expect(applyImport(buf)).rejects.toMatchObject({ code: "IMPORT_HAS_ERRORS" });
    expect(await prisma.product.count()).toBe(1);
    expect(await prisma.storeProductQty.count()).toBe(1);
  });

  it.each(["products-created", "products-updated", "quantities-written"] as const)(
    "lỗi giữa chừng sau bước %s → không có thay đổi nào",
    async (step) => {
      const t = await seed();
      const buf = await file(
        [
          ["AK0001", "Tên đổi", null, null, null, null, null, 1],
          ["MOI01", null, "Kim Bảo", "Lắc", null, null, null, null],
        ],
        [
          ["AK0001", "CH01", 99, 99],
          ["MOI01", "CH02", 5, 5],
        ],
      );
      await expect(
        applyImport(buf, {
          onStep: (s) => {
            if (s === step) throw new Error("giả lập lỗi");
          },
        }),
      ).rejects.toThrow("giả lập lỗi");

      expect(await prisma.product.count()).toBe(1);
      const ak = await prisma.product.findUniqueOrThrow({ where: { sku: "AK0001" } });
      expect(ak).toMatchObject({ name: "Nhẫn A", priceVnd: 38_100_000 });
      const qs = await prisma.storeProductQty.findMany();
      expect(qs).toHaveLength(1);
      expect(qs[0]).toMatchObject({ storeId: t.s1.id, qtyOrdered: 10, qtyReceived: 2 });
    },
  );

  it("áp dụng lô lớn: 2.500 SP mới × 3 cửa hàng (chia nhiều lô ghi)", async () => {
    await seed();
    const products = Array.from({ length: 2500 }, (_, i) => [
      `BULK${String(i).padStart(5, "0")}`,
      null,
      "Phúc Lộc",
      "Nhẫn",
      null,
      null,
      null,
      i,
    ]);
    const quantities = products.flatMap((p) => ["CH01", "CH02"].map((c) => [p[0], c, 2, 1]));
    const r = await applyImport(await file(products, quantities));
    expect(r).toMatchObject({ newProducts: 2500, quantityRows: 5000 });
    expect(await prisma.product.count()).toBe(2501);
    expect(await prisma.storeProductQty.count()).toBe(5001);
  });
});
