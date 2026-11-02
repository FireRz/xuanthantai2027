import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { viewerList } from "@/server/services/export";
import { fixture } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "" };

describe("T11.1 — export.viewerList", () => {
  it("số dòng = số kết quả trên trang (không phân trang), cùng thứ tự", async () => {
    const fx = await fixture(); // 36 SP > 24 SP/trang
    const page = await listProducts({ ...base, limit: 1000 });
    const r = await viewerList(base);
    expect(r.items.length).toBe(36);
    expect(r.items.map((i) => i.sku)).toEqual(page.items.map((i) => i.sku));
    expect((await listProducts(base)).total).toBe(r.items.length);

    // Bộ lọc + sắp xếp giống trang
    const params = {
      ...base,
      brand: [fx.brands[0].brand.id],
      mat: [fx.mats[0].id],
      sort: "price_desc" as const,
    };
    const list = await listProducts({ ...params, limit: 1000 });
    const ex = await viewerList(params);
    expect(ex.items.length).toBe(list.total);
    expect(ex.items.map((i) => i.sku)).toEqual(list.items.map((i) => i.sku));
  });

  it("phạm vi cửa hàng: số liệu của cửa hàng, mặc định chỉ SP đặt > 0; all=1 hiện tất cả", async () => {
    const fx = await fixture();
    const [s1, s2] = fx.stores;
    const [a, b] = await prisma.product.findMany({ orderBy: { sku: "asc" }, take: 2 });
    await prisma.storeProductQty.createMany({
      data: [
        { productId: a.id, storeId: s1.id, qtyOrdered: 5, qtyReceived: 3 },
        { productId: a.id, storeId: s2.id, qtyOrdered: 9, qtyReceived: 9 },
        { productId: b.id, storeId: s2.id, qtyOrdered: 2, qtyReceived: 0 },
      ],
    });

    const r = await viewerList({ ...base, store: s1.code });
    expect(r.scope).toMatchObject({ kind: "store", code: s1.code });
    expect(r.items.map((i) => i.sku)).toEqual([a.sku]);
    expect(r.items[0].metrics).toMatchObject({ ordered: 5, received: 3, shortage: 2 });
    expect((await listProducts({ ...base, store: s1.code })).total).toBe(r.items.length);

    const all = await viewerList({ ...base, store: s1.code, all: true });
    expect(all.items.length).toBe(36);

    const total = await viewerList(base);
    expect(total.scope).toEqual({ kind: "total" });
    expect(total.items.find((i) => i.sku === a.sku)?.metrics).toMatchObject({
      ordered: 14,
      received: 12,
    });
  });
});
