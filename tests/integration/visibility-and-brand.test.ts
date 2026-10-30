import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createProduct,
  findVisibleProducts,
  isProductVisible,
  updateProductClassification,
} from "@/server/repositories/product";
import { DomainError } from "@/server/errors";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function fixture() {
  const { brand, line, collection } = await makeBrandTree();
  const material = await prisma.material.create({ data: { name: "Vàng 24K" } });
  const full = await createProduct({
    sku: "FULL",
    brandId: brand.id,
    productLineId: line.id,
    collectionId: collection.id,
    materialId: material.id,
  });
  const bare = await createProduct({ sku: "BARE", brandId: brand.id, productLineId: line.id });
  return { brand, line, collection, material, full, bare };
}

const skus = async () => (await findVisibleProducts()).map((p) => p.sku);

describe("T01.6 — SP visible (ARCHITECTURE §4.2)", () => {
  it("mặc định mọi SP đều hiển thị, kể cả SP không BST / không chất liệu", async () => {
    await fixture();
    expect(await skus()).toEqual(["BARE", "FULL"]);
  });

  it("ẩn nhãn → mọi SP của nhãn không visible, product.active giữ nguyên", async () => {
    const { brand, full } = await fixture();
    await prisma.brand.update({ where: { id: brand.id }, data: { active: false } });
    expect(await skus()).toEqual([]);
    expect(await isProductVisible(full.id)).toBe(false);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: full.id } })).active).toBe(true);
  });

  it("ẩn dòng → SP ẩn theo", async () => {
    const { line } = await fixture();
    await prisma.productLine.update({ where: { id: line.id }, data: { active: false } });
    expect(await skus()).toEqual([]);
  });

  it("ẩn BST → chỉ SP thuộc BST ẩn; SP không BST vẫn hiện", async () => {
    const { collection } = await fixture();
    await prisma.collection.update({ where: { id: collection.id }, data: { active: false } });
    expect(await skus()).toEqual(["BARE"]);
  });

  it("ẩn chất liệu → chỉ SP có chất liệu đó ẩn", async () => {
    const { material } = await fixture();
    await prisma.material.update({ where: { id: material.id }, data: { active: false } });
    expect(await skus()).toEqual(["BARE"]);
  });

  it("ẩn riêng SP → chỉ SP đó ẩn; hiện lại nhãn không làm hiện SP đã ẩn riêng", async () => {
    const { brand, full } = await fixture();
    await prisma.product.update({ where: { id: full.id }, data: { active: false } });
    await prisma.brand.update({ where: { id: brand.id }, data: { active: false } });
    await prisma.brand.update({ where: { id: brand.id }, data: { active: true } });
    expect(await skus()).toEqual(["BARE"]);
  });
});

describe("T01.6 — dòng / BST cùng nhãn với SP", () => {
  it("gán dòng của nhãn khác → lỗi nghiệp vụ", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await makeBrandTree("Nhãn B");
    await expect(
      createProduct({ sku: "X", brandId: a.brand.id, productLineId: b.line.id }),
    ).rejects.toMatchObject({ code: "LINE_BRAND_MISMATCH" });
  });

  it("gán BST của nhãn khác → lỗi nghiệp vụ", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await makeBrandTree("Nhãn B");
    const attempt = createProduct({
      sku: "X",
      brandId: a.brand.id,
      productLineId: a.line.id,
      collectionId: b.collection.id,
    });
    await expect(attempt).rejects.toBeInstanceOf(DomainError);
    await expect(attempt).rejects.toMatchObject({ code: "COLLECTION_BRAND_MISMATCH" });
  });

  it("đổi nhãn SP mà giữ dòng cũ → lỗi", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await makeBrandTree("Nhãn B");
    const p = await createProduct({ sku: "X", brandId: a.brand.id, productLineId: a.line.id });
    await expect(
      updateProductClassification(p.id, { brandId: b.brand.id, productLineId: a.line.id }),
    ).rejects.toMatchObject({ code: "LINE_BRAND_MISMATCH" });
  });

  it("CSDL cũng chặn khi bỏ qua service (khóa ngoại kép)", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await makeBrandTree("Nhãn B");
    await expect(
      prisma.product.create({
        data: { sku: "X", brandId: a.brand.id, productLineId: b.line.id },
      }),
    ).rejects.toThrow();
  });

  it("CSDL chặn đổi nhãn của dòng đã có SP (ADR-008 M5)", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await prisma.brand.create({ data: { name: "Nhãn B" } });
    await createProduct({ sku: "X", brandId: a.brand.id, productLineId: a.line.id });
    await expect(
      prisma.productLine.update({ where: { id: a.line.id }, data: { brandId: b.id } }),
    ).rejects.toThrow();
  });

  it("mã SP được bỏ khoảng trắng đầu/cuối khi tạo", async () => {
    const a = await makeBrandTree();
    const p = await createProduct({
      sku: "  NTT009 ",
      brandId: a.brand.id,
      productLineId: a.line.id,
    });
    expect(p.sku).toBe("NTT009");
  });
});
