import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createProduct } from "@/server/repositories/product";
import { getProductDetail } from "@/server/services/product-detail";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function addQty(sku: string, storeCode: string, ordered: number, received: number) {
  const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
  const store = await prisma.store.upsert({
    where: { code: storeCode },
    create: { code: storeCode, name: `Cửa hàng ${storeCode}` },
    update: {},
  });
  await prisma.storeProductQty.create({
    data: { productId: product.id, storeId: store.id, qtyOrdered: ordered, qtyReceived: received },
  });
}

describe("T05.2 — catalog.getProductDetail", () => {
  it("trả thông tin SP, từng cửa hàng đang hoạt động (kể cả chưa có số liệu) và tổng tính trên số tổng", async () => {
    const { brand, line } = await makeBrandTree();
    await createProduct({ sku: "NTT001", brandId: brand.id, productLineId: line.id });
    await addQty("NTT001", "A", 5, 7);
    await addQty("NTT001", "B", 5, 3);
    await prisma.store.create({ data: { code: "C", name: "Cửa hàng C" } }); // chưa có dòng SL
    await prisma.store.create({ data: { code: "Z", name: "Đã ẩn", active: false } });
    await addQty("NTT001", "Z", 100, 0); // CH ẩn không cộng, không liệt kê

    const d = await getProductDetail("NTT001");
    expect(d).not.toBeNull();
    expect(d!.brandName).toBe("Nhãn A");
    expect(d!.collectionName).toBeNull();
    expect(d!.stores.map((s) => s.code)).toEqual(["A", "B", "C"]);
    expect(d!.stores[0].metrics).toEqual({ ordered: 5, received: 7, shortage: 0, rate: 1 });
    expect(d!.stores[2].metrics).toEqual({ ordered: 0, received: 0, shortage: 0, rate: null });
    // Ví dụ ADR-007: A 5/7, B 5/3 → tổng 10/10, thiếu 0, 100%
    expect(d!.total).toEqual({ ordered: 10, received: 10, shortage: 0, rate: 1 });
  });

  it("mã không phân biệt hoa/thường; mã không có → null", async () => {
    const { brand, line } = await makeBrandTree();
    await createProduct({ sku: "NTT001", brandId: brand.id, productLineId: line.id });
    expect((await getProductDetail("ntt001"))?.sku).toBe("NTT001");
    expect(await getProductDetail("KHONGCO")).toBeNull();
    expect(await getProductDetail("  ")).toBeNull();
  });

  it("SP ẩn, hoặc nhãn/dòng/BST/chất liệu của nó bị ẩn → null", async () => {
    const { brand, line, collection } = await makeBrandTree();
    const material = await prisma.material.create({ data: { name: "Vàng" } });
    const mk = (sku: string) =>
      createProduct({
        sku,
        brandId: brand.id,
        productLineId: line.id,
        collectionId: collection.id,
        materialId: material.id,
      });
    await mk("OK1");
    await mk("HID1");
    expect((await getProductDetail("OK1"))?.sku).toBe("OK1");

    await prisma.product.update({ where: { sku: "HID1" }, data: { active: false } });
    expect(await getProductDetail("HID1")).toBeNull();

    await prisma.material.update({ where: { id: material.id }, data: { active: false } });
    expect(await getProductDetail("OK1")).toBeNull();
    await prisma.material.update({ where: { id: material.id }, data: { active: true } });
    await prisma.collection.update({ where: { id: collection.id }, data: { active: false } });
    expect(await getProductDetail("OK1")).toBeNull();
    await prisma.collection.update({ where: { id: collection.id }, data: { active: true } });
    await prisma.productLine.update({ where: { id: line.id }, data: { active: false } });
    expect(await getProductDetail("OK1")).toBeNull();
    await prisma.productLine.update({ where: { id: line.id }, data: { active: true } });
    await prisma.brand.update({ where: { id: brand.id }, data: { active: false } });
    expect(await getProductDetail("OK1")).toBeNull();
  });
});
