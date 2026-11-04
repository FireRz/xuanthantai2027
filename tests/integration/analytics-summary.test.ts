import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { computeMetrics, sellThrough } from "@/lib/metrics";
import { stockStatus } from "@/lib/status";
import { listProducts } from "@/server/services/catalog";
import {
  getAnalyticsSummary,
  getTopProducts,
  type AnalyticsParams,
} from "@/server/services/analytics";
import { fixture, type Fx } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base: AnalyticsParams = {
  brand: [],
  line: [],
  col: [],
  mat: [],
  typ: [],
  pr: [],
  store: null,
  all: false,
  q: "",
};

/** Gán SL theo mẫu lặp: có SP chưa đặt, chưa về, đủ, thiếu, dư, hết hàng (Về>0, Tồn=0). */
async function seedQty(fx: Fx) {
  const pattern: [number, number, number, number][] = [
    // [đặt, về, bán, tồn]
    [0, 0, 0, 0],
    [5, 0, 0, 0],
    [5, 5, 3, 2],
    [5, 3, 1, 2],
    [4, 7, 7, 0],
    [10, 2, 0, 2],
    [6, 6, 6, 0],
    [3, 1, 4, 0],
  ];
  const rows: {
    productId: string;
    storeId: string;
    qtyOrdered: number;
    qtyReceived: number;
    qtySold: number;
    qtyStock: number;
  }[] = [];
  const prods = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  prods.forEach((p, i) => {
    fx.stores.forEach((s, j) => {
      const [o, r, so, st] = pattern[(i + j * 3) % pattern.length];
      // S1 bỏ trống một số SP để có SP "không có dòng SL" ở cửa hàng
      if (j === 0 && i % 5 === 4) return;
      rows.push({
        productId: p.id,
        storeId: s.id,
        qtyOrdered: o + (o > 0 ? i % 3 : 0),
        qtyReceived: r,
        qtySold: so,
        qtyStock: st,
      });
    });
  });
  await prisma.storeProductQty.createMany({ data: rows });
}

/** Số mong đợi cộng từ chính danh sách của danh mục. */
async function expected(params: AnalyticsParams) {
  const { items } = await listProducts({ ...params, limit: null });
  const sum = (f: (i: (typeof items)[number]) => number) => items.reduce((a, i) => a + f(i), 0);
  return {
    items,
    products: items.length,
    ordered: sum((i) => i.metrics.ordered),
    received: sum((i) => i.metrics.received),
    shortage: sum((i) => i.metrics.shortage),
    sold: sum((i) => i.sold),
    stock: sum((i) => i.stock),
  };
}

/** Fixture + khung giá cho nửa số SP + SL. */
async function setup() {
  const fx = await fixture();
  const pr = await prisma.priceRange.create({ data: { name: "< 1tr" } });
  const prods = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  await prisma.product.updateMany({
    where: { id: { in: prods.filter((_, i) => i % 2 === 0).map((p) => p.id) } },
    data: { priceRangeId: pr.id },
  });
  await seedQty(fx);
  return { ...fx, pr };
}

describe("Phân tích — getAnalyticsSummary", () => {
  const cases: [string, (fx: Fx & { pr: { id: string } }) => AnalyticsParams][] = [
    ["không lọc", () => ({ ...base })],
    ["lọc một nhãn", (fx) => ({ ...base, brand: [fx.brands[0].brand.id] })],
    ["nhãn + khung giá", (fx) => ({ ...base, brand: [fx.brands[1].brand.id], pr: [fx.pr.id] })],
    ["một cửa hàng, all=false", () => ({ ...base, store: "S2" })],
    ["cùng cửa hàng, all=true", () => ({ ...base, store: "S2", all: true })],
    ["tìm mã q", () => ({ ...base, q: "P01" })],
    ["cửa hàng không tồn tại", () => ({ ...base, store: "KHONGCO" })],
  ];

  for (const [name, mk] of cases) {
    it(`số tổng khớp listProducts với ${name}`, async () => {
      const fx = await setup();
      const params = mk(fx);
      const e = await expected(params);
      expect(e.products).toBeGreaterThan(0);
      const s = await getAnalyticsSummary(params);
      expect(s).toMatchObject({
        products: e.products,
        ordered: e.ordered,
        received: e.received,
        shortage: e.shortage,
        sold: e.sold,
        stock: e.stock,
      });
      expect(s.receivedRate).toBe(computeMetrics(e.ordered, e.received).rate);
      expect(s.sellRate).toBe(sellThrough(e.sold, e.stock));
    });
  }

  it("đếm trạng thái khớp stockStatus từng item; soldOut đếm Về>0 và Tồn=0", async () => {
    await setup();
    for (const params of [base, { ...base, store: "S1" }, { ...base, store: "S1", all: true }]) {
      const { items } = await listProducts({ ...params, limit: null });
      const status = { noorder: 0, none: 0, full: 0, short: 0 };
      for (const i of items) status[stockStatus(i.metrics)]++;
      const s = await getAnalyticsSummary(params);
      expect(s.status).toEqual(status);
      expect(s.soldOut).toBe(items.filter((i) => i.metrics.received > 0 && i.stock === 0).length);
      expect(s.status.noorder + s.status.none + s.status.full + s.status.short).toBe(s.products);
    }
    const all = await getAnalyticsSummary({ ...base, store: "S1", all: true });
    expect(all.status.noorder).toBeGreaterThan(0);
    expect(all.status.none).toBeGreaterThan(0);
    expect(all.status.full).toBeGreaterThan(0);
    expect(all.status.short).toBeGreaterThan(0);
    expect(all.soldOut).toBeGreaterThan(0);
  });

  it("Thiếu là tổng max(Đặt−Về,0) từng SP, không phải ΣĐặt − ΣVề", async () => {
    const fx = await fixture();
    const [a, b] = await prisma.product.findMany({ orderBy: { sku: "asc" }, take: 2 });
    const s1 = fx.stores[0];
    await prisma.storeProductQty.createMany({
      data: [
        { productId: a.id, storeId: s1.id, qtyOrdered: 5, qtyReceived: 9 },
        { productId: b.id, storeId: s1.id, qtyOrdered: 4, qtyReceived: 1 },
      ],
    });
    const s = await getAnalyticsSummary({ ...base, store: "S1" });
    expect(s).toMatchObject({ ordered: 9, received: 10, shortage: 3 });
  });

  it("ΣĐặt=0 → receivedRate null; Bán+Tồn=0 → sellRate null", async () => {
    const fx = await fixture();
    // P001 không có dòng SL nào → không đặt, không bán, không tồn
    const s = await getAnalyticsSummary({ ...base, q: "P001" });
    expect(s.products).toBe(1);
    expect(s.receivedRate).toBeNull();
    expect(s.sellRate).toBeNull();
    expect(s.status.noorder).toBe(1);
    // Có Về nhưng không đặt → vẫn null
    const p = await prisma.product.findUniqueOrThrow({ where: { sku: "P002" } });
    await prisma.storeProductQty.create({
      data: { productId: p.id, storeId: fx.stores[0].id, qtyOrdered: 0, qtyReceived: 3 },
    });
    expect((await getAnalyticsSummary({ ...base, q: "P002" })).receivedRate).toBeNull();
  });

  it("cửa hàng ẩn không cộng vào tổng", async () => {
    const fx = await fixture();
    await seedQty(fx);
    const before = await getAnalyticsSummary(base);
    await prisma.store.update({ where: { id: fx.stores[2].id }, data: { active: false } });
    const after = await getAnalyticsSummary(base);
    expect(after.ordered).toBeLessThan(before.ordered);
    const e = await expected(base);
    expect(after).toMatchObject({ ordered: e.ordered, received: e.received, stock: e.stock });
    // chọn cửa hàng ẩn → rơi về tổng hệ thống
    expect(await getAnalyticsSummary({ ...base, store: "S3" })).toEqual(after);
  });
});

describe("Phân tích — getTopProducts", () => {
  async function seedTop() {
    const fx = await fixture();
    const prods = await prisma.product.findMany({ orderBy: { sku: "asc" } });
    const values = [9, 9, 7, 7, 7, 5, 5, 5, 5, 3, 3, 2, 1, 1];
    await prisma.storeProductQty.createMany({
      data: prods.slice(0, 20).map((p, i) => {
        const v = values[i] ?? 0;
        return {
          productId: p.id,
          storeId: fx.stores[0].id,
          qtyOrdered: v + 2,
          qtyReceived: 2,
          qtySold: v,
          qtyStock: 1,
        };
      }),
    });
  }

  for (const kind of ["sold", "shortage"] as const) {
    it(`top ${kind}: tối đa 10, chỉ value>0, giảm dần, hòa theo sku tăng dần`, async () => {
      await seedTop();
      const top = await getTopProducts(base, kind);
      expect(top).toHaveLength(10);
      expect(top.every((t) => t.value > 0)).toBe(true);
      for (let i = 1; i < top.length; i++) {
        const [a, b] = [top[i - 1], top[i]];
        expect(a.value > b.value || (a.value === b.value && a.sku < b.sku)).toBe(true);
      }
      expect(top.map((t) => t.value)).toEqual([9, 9, 7, 7, 7, 5, 5, 5, 5, 3]);
      expect(top[0]).toMatchObject({ sku: "P001", name: null, thumbUrl: null });
      expect(await getTopProducts(base, kind, 3)).toHaveLength(3);
    });
  }

  it("không có SP nào value>0 → mảng rỗng", async () => {
    await fixture();
    expect(await getTopProducts(base, "sold")).toEqual([]);
  });
});
