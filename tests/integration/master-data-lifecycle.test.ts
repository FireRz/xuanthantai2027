import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createProduct } from "@/server/repositories/product";
import { listProducts } from "@/server/services/catalog";
import { deleteMasterItem, getHideImpact, setActive } from "@/server/services/master-data";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "", col: [] as string[] };
const catalogSkus = async () =>
  (await listProducts({ ...base, limit: 100 })).items.map((i) => i.sku);

async function makeProducts(n: number, extra: { materialId?: string } = {}) {
  const { brand, line, collection } = await makeBrandTree();
  for (let i = 1; i <= n; i++) {
    await createProduct({
      sku: `SP${String(i).padStart(3, "0")}`,
      brandId: brand.id,
      productLineId: line.id,
      ...extra,
    });
  }
  return { brand, line, collection };
}

describe("T06.4 — ẩn / hiện và ẩn theo", () => {
  it("ẩn nhãn có 10 SP: phải xác nhận trước; sau xác nhận trang xem mất 10 SP; hiện lại → trở lại (AC4)", async () => {
    const { brand } = await makeProducts(10);
    expect(await catalogSkus()).toHaveLength(10);

    expect(await getHideImpact("brand", brand.id)).toMatchObject({ affected: 10, active: true });

    // Chưa xác nhận → không ẩn, trả về số SP bị ảnh hưởng.
    const ask = await setActive("brand", brand.id, false);
    expect(ask).toEqual({ status: "needs_confirmation", affected: 10 });
    expect(await catalogSkus()).toHaveLength(10);

    const done = await setActive("brand", brand.id, false, { confirm: true });
    expect(done).toMatchObject({ status: "done", active: false, affected: 10 });
    expect(await catalogSkus()).toHaveLength(0);
    // product.active không đổi (ADR-008 M2)
    expect(await prisma.product.count({ where: { active: true } })).toBe(10);

    const shown = await setActive("brand", brand.id, true);
    expect(shown).toMatchObject({ status: "done", active: true, affected: 10 });
    expect(await catalogSkus()).toHaveLength(10);
  });

  it("hiện lại nhãn không làm hiện SP đã bị ẩn riêng", async () => {
    const { brand } = await makeProducts(3);
    await prisma.product.update({ where: { sku: "SP001" }, data: { active: false } });
    expect((await getHideImpact("brand", brand.id)).affected).toBe(2);
    await setActive("brand", brand.id, false, { confirm: true });
    const shown = await setActive("brand", brand.id, true);
    expect(shown).toMatchObject({ affected: 2 });
    expect(await catalogSkus()).toEqual(["SP002", "SP003"]);
  });

  it("ẩn dòng: chỉ SP của dòng đó ẩn theo", async () => {
    const { brand, line } = await makeProducts(2);
    const other = await prisma.productLine.create({ data: { brandId: brand.id, name: "Dòng 2" } });
    await createProduct({ sku: "KHAC", brandId: brand.id, productLineId: other.id });
    expect((await getHideImpact("line", line.id)).affected).toBe(2);
    await setActive("line", line.id, false, { confirm: true });
    expect(await catalogSkus()).toEqual(["KHAC"]);
  });

  it("ẩn BST: SP thuộc BST ẩn, SP không BST vẫn hiện", async () => {
    const { brand, line, collection } = await makeProducts(2);
    await createProduct({ sku: "TRON", brandId: brand.id, productLineId: line.id });
    await prisma.product.updateMany({
      where: { sku: { in: ["SP001", "SP002"] } },
      data: { collectionId: collection.id },
    });
    expect((await getHideImpact("collection", collection.id)).affected).toBe(2);
    await setActive("collection", collection.id, false, { confirm: true });
    expect(await catalogSkus()).toEqual(["TRON"]);
    await setActive("collection", collection.id, true);
    expect(await catalogSkus()).toEqual(["SP001", "SP002", "TRON"]);
  });

  it("ẩn chất liệu: SP có chất liệu đó ẩn theo", async () => {
    const material = await prisma.material.create({ data: { name: "Vàng 18K" } });
    const { brand, line } = await makeProducts(2, { materialId: material.id });
    await createProduct({ sku: "KHONG", brandId: brand.id, productLineId: line.id });
    expect((await getHideImpact("material", material.id)).affected).toBe(2);
    await setActive("material", material.id, false, { confirm: true });
    expect(await catalogSkus()).toEqual(["KHONG"]);
  });

  it("số SP bị ảnh hưởng không tính SP đã ẩn sẵn do danh mục khác", async () => {
    const { brand, line } = await makeProducts(4);
    await setActive("line", line.id, false, { confirm: true });
    expect((await getHideImpact("brand", brand.id)).affected).toBe(0);
  });

  it("ẩn cửa hàng: không cộng vào tổng, mất khỏi bộ lọc (AC5); báo số SP có SL ở cửa hàng đó", async () => {
    await makeProducts(2);
    const a = await prisma.store.create({ data: { code: "A", name: "A" } });
    const b = await prisma.store.create({ data: { code: "B", name: "B" } });
    const sp1 = await prisma.product.findUniqueOrThrow({ where: { sku: "SP001" } });
    await prisma.storeProductQty.createMany({
      data: [
        { productId: sp1.id, storeId: a.id, qtyOrdered: 5, qtyReceived: 7 },
        { productId: sp1.id, storeId: b.id, qtyOrdered: 5, qtyReceived: 3 },
      ],
    });

    expect((await listProducts(base)).items[0].metrics).toMatchObject({
      ordered: 10,
      received: 10,
    });
    expect(await getHideImpact("store", b.id)).toMatchObject({ affected: 1 });

    expect(await setActive("store", b.id, false)).toEqual({
      status: "needs_confirmation",
      affected: 1,
    });
    await setActive("store", b.id, false, { confirm: true });

    expect((await listProducts(base)).items[0].metrics).toMatchObject({
      ordered: 5,
      received: 7,
    });
    // Cửa hàng ẩn → bộ lọc rơi về tổng hệ thống
    expect((await listProducts({ ...base, store: "B" })).scope).toEqual({ kind: "total" });

    await setActive("store", b.id, true);
    expect((await listProducts(base)).items[0].metrics).toMatchObject({
      ordered: 10,
      received: 10,
    });
  });

  it("ẩn mục đã ẩn → không đổi, không cần xác nhận lại", async () => {
    const { brand } = await makeProducts(1);
    await setActive("brand", brand.id, false, { confirm: true });
    expect(await setActive("brand", brand.id, false)).toMatchObject({
      status: "done",
      active: false,
      affected: 0,
    });
  });

  it("không tồn tại → lỗi", async () => {
    await expect(
      setActive("brand", "00000000-0000-4000-8000-000000000000", false, { confirm: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("T06.4 — xóa có điều kiện (AC6)", () => {
  it("xóa được cả 5 loại khi chưa có tham chiếu", async () => {
    const brand = await prisma.brand.create({ data: { name: "B" } });
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "L" } });
    const col = await prisma.collection.create({ data: { brandId: brand.id, name: "C" } });
    const mat = await prisma.material.create({ data: { name: "M" } });
    const store = await prisma.store.create({ data: { code: "S", name: "S" } });

    await deleteMasterItem("line", line.id);
    await deleteMasterItem("collection", col.id);
    await deleteMasterItem("material", mat.id);
    await deleteMasterItem("store", store.id);
    await deleteMasterItem("brand", brand.id);
    expect(await prisma.brand.count()).toBe(0);
    expect(await prisma.productLine.count()).toBe(0);
    expect(await prisma.store.count()).toBe(0);
  });

  it("không xóa được khi đang có SP tham chiếu (kể cả SP đã ẩn)", async () => {
    const material = await prisma.material.create({ data: { name: "Vàng" } });
    const { brand, line, collection } = await makeProducts(2, { materialId: material.id });
    await prisma.product.updateMany({ data: { active: false, collectionId: collection.id } });

    for (const [kind, id] of [
      ["brand", brand.id],
      ["line", line.id],
      ["collection", collection.id],
      ["material", material.id],
    ] as const) {
      await expect(deleteMasterItem(kind, id)).rejects.toMatchObject({ code: "IN_USE" });
    }
    expect(await prisma.productLine.count()).toBe(1);
  });

  it("nhãn còn dòng / BST (chưa có SP) cũng không xóa được", async () => {
    const { brand } = await makeBrandTree();
    await expect(deleteMasterItem("brand", brand.id)).rejects.toMatchObject({ code: "IN_USE" });
  });

  it("cửa hàng đã có dòng SL → không xóa được", async () => {
    await makeProducts(1);
    const store = await prisma.store.create({ data: { code: "A", name: "A" } });
    const p = await prisma.product.findFirstOrThrow();
    await prisma.storeProductQty.create({
      data: { productId: p.id, storeId: store.id, qtyOrdered: 1, qtyReceived: 0 },
    });
    await expect(deleteMasterItem("store", store.id)).rejects.toMatchObject({ code: "IN_USE" });
  });
});
