import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createBrand,
  createCollection,
  createLine,
  renameBrand,
  updateCollection,
  updateLine,
} from "@/server/services/master-data";
import { createProduct } from "@/server/repositories/product";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("T06.1 — Nhãn", () => {
  it("tạo nhãn; tên được bỏ khoảng trắng thừa", async () => {
    const b = await createBrand("  Nhãn   A ");
    expect(b.name).toBe("Nhãn A");
    expect(b.active).toBe(true);
  });

  it("tên rỗng → lỗi", async () => {
    await expect(createBrand("   ")).rejects.toMatchObject({ code: "NAME_INVALID" });
  });

  it("trùng tên (không phân biệt hoa/thường) → lỗi", async () => {
    await createBrand("Nhãn A");
    await expect(createBrand("nhãn a")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
  });

  it("đổi tên giữ nguyên liên kết SP (AC3)", async () => {
    const { brand, line } = await makeBrandTree();
    const p = await createProduct({ sku: "X", brandId: brand.id, productLineId: line.id });
    await renameBrand(brand.id, "Nhãn Mới");
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      include: { brand: true },
    });
    expect(after.brand.name).toBe("Nhãn Mới");
  });

  it("đổi tên trùng nhãn khác → lỗi; giữ nguyên tên cũ → OK", async () => {
    const a = await createBrand("A");
    await createBrand("B");
    await expect(renameBrand(a.id, "B")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
    await expect(renameBrand(a.id, "A")).resolves.toMatchObject({ name: "A" });
  });
});

describe("T06.1 — Dòng hàng", () => {
  it("tạo Dòng không chọn nhãn → lỗi (AC1)", async () => {
    await expect(createLine("", "Nhẫn")).rejects.toMatchObject({ code: "BRAND_REQUIRED" });
    await expect(createLine(null, "Nhẫn")).rejects.toMatchObject({ code: "BRAND_REQUIRED" });
  });

  it("nhãn không tồn tại → lỗi", async () => {
    await expect(createLine("00000000-0000-4000-8000-000000000000", "Nhẫn")).rejects.toMatchObject({
      code: "BRAND_NOT_FOUND",
    });
  });

  it("trùng tên trong cùng nhãn → lỗi; khác nhãn → OK", async () => {
    const a = await createBrand("A");
    const b = await createBrand("B");
    await createLine(a.id, "Nhẫn");
    await expect(createLine(a.id, "nhẫn")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
    await expect(createLine(b.id, "Nhẫn")).resolves.toMatchObject({ brandId: b.id });
  });

  it("đổi tên trùng trong nhãn → lỗi", async () => {
    const a = await createBrand("A");
    await createLine(a.id, "Nhẫn");
    const l2 = await createLine(a.id, "Dây");
    await expect(updateLine(l2.id, { name: "Nhẫn" })).rejects.toMatchObject({
      code: "NAME_DUPLICATE",
    });
  });

  it("đổi nhãn của Dòng đã có SP → bị chặn (ADR-008 M5)", async () => {
    const { brand, line } = await makeBrandTree();
    const other = await createBrand("B");
    await createProduct({ sku: "X", brandId: brand.id, productLineId: line.id });
    await expect(updateLine(line.id, { brandId: other.id })).rejects.toMatchObject({
      code: "BRAND_CHANGE_BLOCKED",
    });
    expect((await prisma.productLine.findUniqueOrThrow({ where: { id: line.id } })).brandId).toBe(
      brand.id,
    );
  });

  it("Dòng chưa có SP đổi được nhãn, nhưng vẫn kiểm tra trùng tên ở nhãn mới", async () => {
    const a = await createBrand("A");
    const b = await createBrand("B");
    const l = await createLine(a.id, "Nhẫn");
    await createLine(b.id, "Nhẫn");
    await expect(updateLine(l.id, { brandId: b.id })).rejects.toMatchObject({
      code: "NAME_DUPLICATE",
    });
    await expect(updateLine(l.id, { brandId: b.id, name: "Nhẫn 2" })).resolves.toMatchObject({
      brandId: b.id,
    });
  });

  it("đổi tên Dòng đã có SP vẫn được", async () => {
    const { brand, line } = await makeBrandTree();
    await createProduct({ sku: "X", brandId: brand.id, productLineId: line.id });
    await expect(updateLine(line.id, { name: "Tên mới" })).resolves.toMatchObject({
      name: "Tên mới",
    });
  });
});

describe("T06.1 — Bộ sưu tập", () => {
  it("tạo BST không chọn nhãn → lỗi (AC1)", async () => {
    await expect(createCollection("", "Phúc Lộc")).rejects.toMatchObject({
      code: "BRAND_REQUIRED",
    });
  });

  it("trùng tên trong cùng nhãn → lỗi; khác nhãn → OK", async () => {
    const a = await createBrand("A");
    const b = await createBrand("B");
    await createCollection(a.id, "Phúc Lộc");
    await expect(createCollection(a.id, "PHÚC LỘC")).rejects.toMatchObject({
      code: "NAME_DUPLICATE",
    });
    await expect(createCollection(b.id, "Phúc Lộc")).resolves.toMatchObject({ brandId: b.id });
  });

  it("đổi nhãn của BST đã có SP → bị chặn", async () => {
    const { brand, line, collection } = await makeBrandTree();
    const other = await createBrand("B");
    await createProduct({
      sku: "X",
      brandId: brand.id,
      productLineId: line.id,
      collectionId: collection.id,
    });
    await expect(updateCollection(collection.id, { brandId: other.id })).rejects.toMatchObject({
      code: "BRAND_CHANGE_BLOCKED",
    });
  });
});
