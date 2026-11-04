import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { computeMetrics, sellThrough } from "@/lib/metrics";
import type { GroupDim } from "@/lib/analytics-params";
import {
  getAnalyticsSummary,
  getGroupBreakdown,
  type AnalyticsParams,
  type GroupRow,
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

const ATTR_DIMS: GroupDim[] = ["brand", "line", "col", "mat", "typ", "pr"];

type Key = "products" | "ordered" | "received" | "shortage" | "sold" | "stock";
const sum = (rows: GroupRow[], k: Key) => rows.reduce((a, r) => a + r[k], 0);

/** Gán SL theo mẫu lặp cho mọi (SP, cửa hàng); S1 bỏ trống một số SP. */
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
  const prods = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  const rows: {
    productId: string;
    storeId: string;
    qtyOrdered: number;
    qtyReceived: number;
    qtySold: number;
    qtyStock: number;
  }[] = [];
  prods.forEach((p, i) => {
    fx.stores.forEach((s, j) => {
      if (j === 0 && i % 5 === 4) return;
      const [o, r, so, st] = pattern[(i + j * 3) % pattern.length];
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

/** Fixture + khung giá, chủng loại cho một phần SP (phần còn lại thiếu) + SL. */
async function setup() {
  const fx = await fixture();
  const pr = await prisma.priceRange.create({ data: { name: "< 1tr" } });
  const typ = await prisma.productType.create({ data: { name: "Nhẫn cưới" } });
  const prods = await prisma.product.findMany({ orderBy: { sku: "asc" } });
  await prisma.product.updateMany({
    where: { id: { in: prods.filter((_, i) => i % 2 === 0).map((p) => p.id) } },
    data: { priceRangeId: pr.id },
  });
  await prisma.product.updateMany({
    where: { id: { in: prods.filter((_, i) => i % 3 === 0).map((p) => p.id) } },
    data: { productTypeId: typ.id },
  });
  await seedQty(fx);
  return { ...fx, pr, typ };
}

describe("Phân tích — getGroupBreakdown, chiều thuộc tính SP", () => {
  for (const dim of ATTR_DIMS) {
    for (const [label, mk] of [
      ["không lọc", () => base],
      ["một bộ lọc nhãn", (fx: Fx) => ({ ...base, brand: [fx.brands[0].brand.id] })],
    ] as const) {
      it(`chiều ${dim}, ${label}: tổng các dòng = getAnalyticsSummary`, async () => {
        const fx = await setup();
        const params = mk(fx);
        const rows = await getGroupBreakdown(params, dim);
        const s = await getAnalyticsSummary(params);
        expect(rows.length).toBeGreaterThan(0);
        for (const k of ["products", "ordered", "received", "shortage", "sold", "stock"] as Key[]) {
          expect(sum(rows, k)).toBe(s[k]);
        }
        expect(rows.every((r) => r.products > 0)).toBe(true);
        for (let i = 1; i < rows.length; i++) {
          const [a, b] = [rows[i - 1], rows[i]];
          expect(a.products > b.products || (a.products === b.products && a.name <= b.name)).toBe(
            true,
          );
        }
      });
    }
  }

  it("cũng khớp khi chọn một cửa hàng", async () => {
    await setup();
    for (const dim of ATTR_DIMS) {
      const params = { ...base, store: "S2" };
      const rows = await getGroupBreakdown(params, dim);
      const s = await getAnalyticsSummary(params);
      for (const k of ["products", "ordered", "shortage", "stock"] as Key[]) {
        expect(sum(rows, k)).toBe(s[k]);
      }
    }
  });

  it("col có SP ngoài BST → một dòng id null tên 'Ngoài bộ sưu tập'", async () => {
    await setup();
    const rows = await getGroupBreakdown(base, "col");
    const empty = rows.filter((r) => r.id === null);
    expect(empty).toHaveLength(1);
    expect(empty[0].name).toBe("Ngoài bộ sưu tập");
    expect(empty[0].products).toBe(await prisma.product.count({ where: { collectionId: null } }));
    expect(rows.filter((r) => r.id !== null).every((r) => r.name.startsWith("BST"))).toBe(true);
  });

  it("mat, typ, pr có SP thiếu thuộc tính → đúng một dòng rỗng với tên đã định", async () => {
    const fx = await setup();
    const cases: [GroupDim, string, number][] = [
      ["mat", "Chưa có tuổi vàng", await prisma.product.count({ where: { materialId: null } })],
      ["typ", "Chưa có chủng loại", await prisma.product.count({ where: { productTypeId: null } })],
      ["pr", "Ngoài khung giá", await prisma.product.count({ where: { priceRangeId: null } })],
    ];
    for (const [dim, name, n] of cases) {
      const rows = await getGroupBreakdown(base, dim);
      expect(rows.filter((r) => r.id === null)).toHaveLength(1);
      expect(rows.find((r) => r.id === null)).toMatchObject({ name, products: n });
      // lọc nhãn B: vẫn đúng một dòng rỗng
      const sub = await getGroupBreakdown({ ...base, brand: [fx.brands[1].brand.id] }, dim);
      expect(sub.filter((r) => r.id === null)).toHaveLength(1);
    }
  });

  it("không có SP thiếu thuộc tính → không có dòng rỗng", async () => {
    const fx = await fixture();
    const p = await prisma.product.findMany();
    await prisma.product.updateMany({
      where: { id: { in: p.map((x) => x.id) } },
      data: { materialId: fx.mats[0].id },
    });
    const rows = await getGroupBreakdown(base, "mat");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(fx.mats[0].id);
  });

  it("receivedRate/sellRate từng dòng theo công thức §5.1, null khi mẫu 0", async () => {
    const fx = await setup();
    for (const dim of [...ATTR_DIMS, "store" as GroupDim]) {
      for (const r of await getGroupBreakdown(base, dim)) {
        expect(r.receivedRate).toBe(computeMetrics(r.ordered, r.received).rate);
        expect(r.sellRate).toBe(sellThrough(r.sold, r.stock));
      }
    }
    // nhóm có ΣĐặt = 0 và Bán+Tồn = 0 → null
    const p = await prisma.product.findUniqueOrThrow({ where: { sku: "P001" } });
    await prisma.storeProductQty.deleteMany({ where: { productId: p.id } });
    await prisma.product.update({ where: { id: p.id }, data: { materialId: fx.mats[0].id } });
    const only = await getGroupBreakdown({ ...base, q: "P001" }, "mat");
    expect(only).toHaveLength(1);
    expect(only[0]).toMatchObject({ products: 1, receivedRate: null, sellRate: null });
  });
});

describe("Phân tích — getGroupBreakdown, chiều store", () => {
  it("không chọn cửa hàng: Σordered/received/sold/stock = summary; products = số SP đặt>0", async () => {
    const fx = await setup();
    const rows = await getGroupBreakdown(base, "store");
    const s = await getAnalyticsSummary(base);
    expect(rows.map((r) => r.id).sort()).toEqual(["S1", "S2", "S3"]);
    for (const k of ["ordered", "received", "sold", "stock"] as Key[]) {
      expect(sum(rows, k)).toBe(s[k]);
    }
    const all = await prisma.storeProductQty.findMany();
    for (const st of fx.stores) {
      const row = rows.find((r) => r.id === st.code)!;
      const mine = all.filter((q) => q.storeId === st.id);
      expect(row.name).toBe(st.name);
      expect(row.products).toBe(mine.filter((q) => q.qtyOrdered > 0).length);
      // Thiếu tính theo từng cặp (SP, cửa hàng)
      expect(row.shortage).toBe(
        mine.reduce((a, q) => a + Math.max(q.qtyOrdered - q.qtyReceived, 0), 0),
      );
    }
    expect(sum(rows, "shortage")).toBeGreaterThanOrEqual(s.shortage);
  });

  it("cửa hàng ẩn không có dòng; chọn cửa hàng X → chỉ một dòng X", async () => {
    const fx = await setup();
    await prisma.store.update({ where: { id: fx.stores[2].id }, data: { active: false } });
    const rows = await getGroupBreakdown(base, "store");
    expect(rows.map((r) => r.id).sort()).toEqual(["S1", "S2"]);
    const s = await getAnalyticsSummary(base);
    expect(sum(rows, "ordered")).toBe(s.ordered);
    expect(sum(rows, "stock")).toBe(s.stock);

    const one = await getGroupBreakdown({ ...base, store: "S2" }, "store");
    expect(one).toHaveLength(1);
    expect(one[0].id).toBe("S2");
    const s2 = await getAnalyticsSummary({ ...base, store: "S2" });
    expect(one[0]).toMatchObject({ products: s2.products, ordered: s2.ordered, stock: s2.stock });

    // chọn cửa hàng ẩn → rơi về tổng hệ thống (hai cửa hàng đang hiện)
    const hidden = await getGroupBreakdown({ ...base, store: "S3" }, "store");
    expect(hidden.map((r) => r.id).sort()).toEqual(["S1", "S2"]);
  });

  it("cửa hàng không có cặp nào trong tập → không có dòng", async () => {
    const fx = await fixture();
    const p = await prisma.product.findUniqueOrThrow({ where: { sku: "P001" } });
    await prisma.storeProductQty.create({
      data: { productId: p.id, storeId: fx.stores[0].id, qtyOrdered: 2, qtyReceived: 1 },
    });
    const rows = await getGroupBreakdown(base, "store");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "S1", products: 1, ordered: 2, shortage: 1 });
    expect(await getGroupBreakdown({ ...base, q: "P002" }, "store")).toEqual([]);
  });

  it("cửa hàng có cặp nhưng toàn đặt = 0: vẫn có dòng, Số mã 0, giữ Về/Bán/Tồn", async () => {
    const fx = await fixture();
    const p = await prisma.product.findUniqueOrThrow({ where: { sku: "P001" } });
    await prisma.storeProductQty.create({
      data: {
        productId: p.id,
        storeId: fx.stores[0].id,
        qtyOrdered: 0,
        qtyReceived: 3,
        qtySold: 1,
        qtyStock: 2,
      },
    });
    const rows = await getGroupBreakdown(base, "store");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "S1",
      products: 0,
      received: 3,
      stock: 2,
      receivedRate: null,
    });
    expect(rows[0].received).toBe((await getAnalyticsSummary(base)).received);
  });
});
