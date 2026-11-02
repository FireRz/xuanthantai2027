import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createProduct } from "@/server/repositories/product";
import { listCollectionCards, listProducts } from "@/server/services/catalog";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "", col: [] as string[] };

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

describe("T03.1 — catalog.listProducts", () => {
  it("tổng hệ thống tính trên số tổng — ví dụ ADR-007: A 5/7, B 5/3 → thiếu 0, tỷ lệ 100%", async () => {
    const { brand, line } = await makeBrandTree();
    await createProduct({ sku: "NTT001", brandId: brand.id, productLineId: line.id });
    await addQty("NTT001", "A", 5, 7);
    await addQty("NTT001", "B", 5, 3);

    const r = await listProducts(base);
    expect(r.scope).toEqual({ kind: "total" });
    expect(r.items[0].metrics).toEqual({ ordered: 10, received: 10, shortage: 0, rate: 1 });
  });

  it("chọn cửa hàng → số của cửa hàng đó; mặc định chỉ SP có đặt > 0, all=1 hiện tất cả", async () => {
    const { brand, line } = await makeBrandTree();
    for (const sku of ["NTT001", "NTT002", "NTT003"])
      await createProduct({ sku, brandId: brand.id, productLineId: line.id });
    await addQty("NTT001", "A", 5, 7);
    await addQty("NTT001", "B", 5, 3);
    await addQty("NTT002", "B", 0, 0); // đặt = 0
    // NTT003: B chưa có dòng SL

    const b = await listProducts({ ...base, store: "b" }); // không phân biệt hoa/thường
    expect(b.scope).toMatchObject({ kind: "store", code: "B" });
    expect(b.items.map((i) => i.sku)).toEqual(["NTT001"]);
    expect(b.total).toBe(1);
    expect(b.items[0].metrics).toEqual({ ordered: 5, received: 3, shortage: 2, rate: 0.6 });

    const all = await listProducts({ ...base, store: "B", all: true });
    expect(all.items.map((i) => i.sku)).toEqual(["NTT001", "NTT002", "NTT003"]);
    expect(all.items[2].metrics).toEqual({ ordered: 0, received: 0, shortage: 0, rate: null });
  });

  it("SP ẩn (SP, nhãn, dòng, BST, chất liệu) không trả về; CH ẩn không cộng vào tổng", async () => {
    const { brand, line, collection } = await makeBrandTree();
    const material = await prisma.material.create({ data: { name: "Vàng 18K" } });
    await createProduct({ sku: "OK1", brandId: brand.id, productLineId: line.id });
    await createProduct({ sku: "HIDDEN1", brandId: brand.id, productLineId: line.id });
    await createProduct({
      sku: "HIDDEN2",
      brandId: brand.id,
      productLineId: line.id,
      collectionId: collection.id,
    });
    await createProduct({
      sku: "HIDDEN3",
      brandId: brand.id,
      productLineId: line.id,
      materialId: material.id,
    });
    await prisma.product.update({ where: { sku: "HIDDEN1" }, data: { active: false } });
    await prisma.collection.update({ where: { id: collection.id }, data: { active: false } });
    await prisma.material.update({ where: { id: material.id }, data: { active: false } });
    await addQty("OK1", "A", 10, 4);
    await addQty("OK1", "B", 6, 6);
    await prisma.store.update({ where: { code: "B" }, data: { active: false } });

    const r = await listProducts(base);
    expect(r.items.map((i) => i.sku)).toEqual(["OK1"]);
    expect(r.items[0].metrics).toMatchObject({ ordered: 10, received: 4, shortage: 6 });

    // Cửa hàng đã ẩn → coi như không chọn
    const hidden = await listProducts({ ...base, store: "B" });
    expect(hidden.scope).toEqual({ kind: "total" });
  });

  it("tìm theo mã (chứa, không phân biệt hoa/thường); % và _ là ký tự thường", async () => {
    const { brand, line } = await makeBrandTree();
    for (const sku of ["NTT001", "NTT002", "AB_1", "ABX1"])
      await createProduct({ sku, brandId: brand.id, productLineId: line.id });
    expect((await listProducts({ ...base, q: "ntt0" })).items).toHaveLength(2);
    expect((await listProducts({ ...base, q: "b_1" })).items.map((i) => i.sku)).toEqual(["AB_1"]);
    expect((await listProducts({ ...base, q: "%" })).items).toHaveLength(0);
  });

  it("lọc BST và Không thuộc BST", async () => {
    const { brand, line, collection } = await makeBrandTree();
    await createProduct({
      sku: "IN1",
      brandId: brand.id,
      productLineId: line.id,
      collectionId: collection.id,
    });
    await createProduct({ sku: "OUT1", brandId: brand.id, productLineId: line.id });
    expect((await listProducts({ ...base, col: [collection.id] })).items.map((i) => i.sku)).toEqual(
      ["IN1"],
    );
    expect((await listProducts({ ...base, col: ["none"] })).items.map((i) => i.sku)).toEqual([
      "OUT1",
    ]);
    expect((await listProducts({ ...base, col: ["none", collection.id] })).total).toBe(2);
  });

  it("phân trang theo Mã A→Z: không trùng, không sót, total đúng", async () => {
    const { brand, line } = await makeBrandTree();
    for (let i = 1; i <= 7; i++)
      await createProduct({
        sku: `P${String(i).padStart(3, "0")}`,
        brandId: brand.id,
        productLineId: line.id,
      });
    const seen: string[] = [];
    for (let offset = 0; offset < 7; offset += 3) {
      const r = await listProducts({ ...base, limit: 3, offset });
      expect(r.total).toBe(7);
      seen.push(...r.items.map((i) => i.sku));
    }
    expect(seen).toEqual(["P001", "P002", "P003", "P004", "P005", "P006", "P007"]);
  });
});

describe("T03.13 — catalog.listCollectionCards", () => {
  it("đếm SP theo BST, thẻ Ngoài BST ở cuối, ảnh = SP đầu tiên theo mã, ẩn SP/BST ẩn", async () => {
    const { brand, line, collection } = await makeBrandTree();
    const emptyCol = await prisma.collection.create({
      data: { brandId: brand.id, name: "BST rỗng" },
    });
    const mk = (sku: string, extra = {}) =>
      createProduct({ sku, brandId: brand.id, productLineId: line.id, ...extra });
    await mk("B2", { collectionId: collection.id });
    await mk("B1", { collectionId: collection.id });
    await mk("B3", { collectionId: collection.id });
    await mk("N1");
    await prisma.product.update({ where: { sku: "B3" }, data: { active: false } });
    await prisma.product.update({ where: { sku: "B1" }, data: { thumbUrl: "https://x/b1.webp" } });
    await prisma.product.update({ where: { sku: "B2" }, data: { thumbUrl: "https://x/b2.webp" } });

    const cards = await listCollectionCards({ store: null, all: false });
    expect(cards).toEqual([
      {
        id: collection.id,
        name: "BST 1",
        brandName: "Nhãn A",
        productCount: 2,
        thumbUrl: "https://x/b1.webp",
      },
      { id: null, name: "Ngoài bộ sưu tập", brandName: null, productCount: 1, thumbUrl: null },
    ]);
    expect(cards.some((c) => c.id === emptyCol.id)).toBe(false); // BST không có SP → không hiện

    // Chọn cửa hàng: chỉ đếm SP cửa hàng đó đặt > 0; all=1 đếm hết
    await addQty("B1", "A", 3, 1);
    const inStore = await listCollectionCards({ store: "A", all: false });
    expect(inStore.map((c) => [c.name, c.productCount])).toEqual([["BST 1", 1]]);
    expect(
      (await listCollectionCards({ store: "A", all: true })).map((c) => c.productCount),
    ).toEqual([2, 1]);
  });
});
