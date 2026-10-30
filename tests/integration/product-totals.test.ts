import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/metrics";
import { prisma } from "@/server/db";
import { createProduct } from "@/server/repositories/product";
import { getProductTotals } from "@/server/repositories/product-totals";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup(qty: Array<[storeCode: string, ordered: number, received: number]>) {
  const { brand, line } = await makeBrandTree();
  const p = await createProduct({ sku: "NTT001", brandId: brand.id, productLineId: line.id });
  for (const [code, ordered, received] of qty) {
    const s = await prisma.store.upsert({
      where: { code },
      create: { code, name: code },
      update: {},
    });
    await prisma.storeProductQty.create({
      data: { productId: p.id, storeId: s.id, qtyOrdered: ordered, qtyReceived: received },
    });
  }
  return p;
}

describe("T01.7 — view product_totals", () => {
  it("ví dụ ADR-007: A 5/7, B 5/3 → tổng 10/10, thiếu 0, tỷ lệ 100%", async () => {
    const p = await setup([
      ["A", 5, 7],
      ["B", 5, 3],
    ]);
    const totals = await getProductTotals([p.id]);
    expect(totals.get(p.id)).toEqual({ ordered: 10, received: 10, shortage: 0, rate: 1 });
  });

  it("khớp computeMetrics trên số tổng", async () => {
    const p = await setup([
      ["A", 70, 40],
      ["B", 50, 50],
    ]);
    expect((await getProductTotals([p.id])).get(p.id)).toEqual(computeMetrics(120, 90));
  });

  it("cửa hàng bị ẩn không cộng vào tổng", async () => {
    const p = await setup([
      ["A", 5, 3],
      ["HIDDEN", 100, 0],
    ]);
    await prisma.store.update({ where: { code: "HIDDEN" }, data: { active: false } });
    expect((await getProductTotals([p.id])).get(p.id)).toEqual({
      ordered: 5,
      received: 3,
      shortage: 2,
      rate: 0.6,
    });
  });

  it("SP chưa có SL hoặc đặt 0 → 0 / tỷ lệ null", async () => {
    const empty = await setup([]);
    expect((await getProductTotals([empty.id])).get(empty.id)).toEqual({
      ordered: 0,
      received: 0,
      shortage: 0,
      rate: null,
    });
    await resetDb();
    const zero = await setup([["A", 0, 3]]);
    expect((await getProductTotals([zero.id])).get(zero.id)).toEqual({
      ordered: 0,
      received: 3,
      shortage: 0,
      rate: null,
    });
  });
});
