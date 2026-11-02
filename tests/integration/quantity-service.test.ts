import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createProduct } from "@/server/services/product";
import { setQuantities, setQuantity } from "@/server/services/quantity";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function fixture() {
  const t = await makeBrandTree();
  const p = await createProduct({ sku: "NTT001", brandId: t.brand.id, productLineId: t.line.id });
  const s1 = await prisma.store.create({ data: { code: "CH01", name: "Cửa hàng 1" } });
  const s2 = await prisma.store.create({ data: { code: "CH02", name: "Cửa hàng 2" } });
  return { p, s1, s2 };
}

const get = (productId: string, storeId: string) =>
  prisma.storeProductQty.findUnique({ where: { productId_storeId: { productId, storeId } } });

describe("T08.2 — quantity.set", () => {
  it("tạo mới: trường không truyền = 0", async () => {
    const { p, s1 } = await fixture();
    await setQuantity(p.id, s1.id, { ordered: 10 });
    const r = await get(p.id, s1.id);
    expect([r?.qtyOrdered, r?.qtyReceived]).toEqual([10, 0]);
  });

  it("ghi đè giá trị cũ (AC2: 10 → 15)", async () => {
    const { p, s1 } = await fixture();
    await setQuantity(p.id, s1.id, { ordered: 10, received: 4 });
    await setQuantity(p.id, s1.id, { ordered: 15 });
    const r = await get(p.id, s1.id);
    expect([r?.qtyOrdered, r?.qtyReceived]).toEqual([15, 4]);
  });

  it("undefined = giữ nguyên, 0 = ghi về 0", async () => {
    const { p, s1 } = await fixture();
    await setQuantity(p.id, s1.id, { ordered: 10, received: 4 });
    await setQuantity(p.id, s1.id, {});
    expect((await get(p.id, s1.id))?.qtyReceived).toBe(4);
    await setQuantity(p.id, s1.id, { received: 0 });
    expect((await get(p.id, s1.id))?.qtyReceived).toBe(0);
  });

  it("SL về > SL đặt được phép (D8)", async () => {
    const { p, s1 } = await fixture();
    await setQuantity(p.id, s1.id, { ordered: 5, received: 7 });
    expect((await get(p.id, s1.id))?.qtyReceived).toBe(7);
  });

  it.each([
    ["âm", { ordered: -1 }],
    ["số lẻ", { received: 1.5 }],
    ["NaN", { ordered: Number.NaN }],
    ["quá lớn", { ordered: 3_000_000_000 }],
  ])("%s → lỗi QTY_INVALID, không ghi gì", async (_n, input) => {
    const { p, s1 } = await fixture();
    await expect(setQuantity(p.id, s1.id, input)).rejects.toMatchObject({ code: "QTY_INVALID" });
    expect(await get(p.id, s1.id)).toBeNull();
  });

  it("SP hoặc cửa hàng không tồn tại → QTY_REF_NOT_FOUND", async () => {
    const { p } = await fixture();
    await expect(
      setQuantity(p.id, "00000000-0000-4000-8000-000000000000", { ordered: 1 }),
    ).rejects.toMatchObject({ code: "QTY_REF_NOT_FOUND" });
  });

  it("setQuantities: một cặp lỗi → không cặp nào được ghi", async () => {
    const { p, s1, s2 } = await fixture();
    await expect(
      setQuantities([
        { productId: p.id, storeId: s1.id, ordered: 3 },
        { productId: p.id, storeId: s2.id, ordered: -2 },
      ]),
    ).rejects.toMatchObject({ code: "QTY_INVALID" });
    expect(await prisma.storeProductQty.count()).toBe(0);
  });

  it("setQuantities ghi nhiều cặp", async () => {
    const { p, s1, s2 } = await fixture();
    await setQuantities([
      { productId: p.id, storeId: s1.id, ordered: 3, received: 1 },
      { productId: p.id, storeId: s2.id, ordered: 8 },
    ]);
    expect(await prisma.storeProductQty.count()).toBe(2);
  });
});
