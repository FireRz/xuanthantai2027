import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { getGroupBreakdown, getAnalyticsSummary } from "@/server/services/analytics";
import { getFacetCounts, listProducts } from "@/server/services/catalog";
import { getProductDetail } from "@/server/services/product-detail";
import { createStore, updateStore } from "@/server/services/master-data";
import { fixture, type Fx } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = {
  brand: [],
  line: [],
  col: [],
  mat: [],
  typ: [],
  pr: [],
  kv: null as string | null,
  store: null as string | null,
  all: false,
  q: "",
};

/** S1, S2 thuộc khu vực "KV1"; S3 thuộc "2". P001 có hàng ở cả 3, P002 chỉ ở S3. */
async function setup(): Promise<Fx> {
  const fx = await fixture();
  const [s1, s2, s3] = fx.stores;
  await prisma.store.update({ where: { id: s1.id }, data: { region: "KV1" } });
  await prisma.store.update({ where: { id: s2.id }, data: { region: "KV1" } });
  await prisma.store.update({ where: { id: s3.id }, data: { region: "2" } });
  const [p1, p2] = await prisma.product.findMany({ orderBy: { sku: "asc" }, take: 2 });
  await prisma.storeProductQty.createMany({
    data: [
      { productId: p1.id, storeId: s1.id, qtyOrdered: 3, qtyReceived: 1, qtySold: 0, qtyStock: 1 },
      { productId: p1.id, storeId: s2.id, qtyOrdered: 2, qtyReceived: 2, qtySold: 1, qtyStock: 1 },
      { productId: p1.id, storeId: s3.id, qtyOrdered: 4, qtyReceived: 4, qtySold: 4, qtyStock: 0 },
      { productId: p2.id, storeId: s3.id, qtyOrdered: 5, qtyReceived: 0, qtySold: 0, qtyStock: 0 },
    ],
  });
  return fx;
}

describe("phạm vi khu vực (?kv=)", () => {
  it("danh sách: chỉ SP có đặt trong khu vực, số = tổng các cửa hàng của khu vực (không phân biệt hoa/thường)", async () => {
    await setup();
    const r = await listProducts({ ...base, kv: "kv1" });
    expect(r.scope).toEqual({ kind: "region", region: "KV1" });
    expect(r.items.map((i) => i.sku)).toEqual(["P001"]);
    expect(r.items[0].metrics.ordered).toBe(5);
    expect(r.items[0].metrics.received).toBe(3);
    expect(r.items[0].sold).toBe(1);
    expect(r.items[0].stock).toBe(2);
  });

  it("cửa hàng ẩn không cộng vào khu vực", async () => {
    const fx = await setup();
    await prisma.store.update({ where: { id: fx.stores[1].id }, data: { active: false } });
    const r = await listProducts({ ...base, kv: "KV1" });
    expect(r.items[0].metrics.ordered).toBe(3);
  });

  it("'Xem tất cả SP' trong khu vực: hiện cả SP khu vực chưa đặt (số 0)", async () => {
    await setup();
    const r = await listProducts({ ...base, kv: "KV1", all: true, limit: null });
    const p2 = r.items.find((i) => i.sku === "P002")!;
    expect(p2.metrics.ordered).toBe(0);
  });

  it("khu vực không có cửa hàng đang hiện → tổng hệ thống; có cửa hàng thì cửa hàng được ưu tiên", async () => {
    await setup();
    expect((await listProducts({ ...base, kv: "9" })).scope).toEqual({ kind: "total" });
    const r = await listProducts({ ...base, kv: "KV1", store: "S3" });
    expect(r.scope).toMatchObject({ kind: "store", code: "S3" });
  });

  it("popup: bảng chỉ gồm cửa hàng của khu vực, dòng tổng = tổng khu vực", async () => {
    await setup();
    const d = (await getProductDetail("P001", null, "kv1"))!;
    expect(d.region).toBe("KV1");
    expect(d.stores.map((s) => s.code)).toEqual(["S1", "S2"]);
    expect(d.total.ordered).toBe(5);
    expect(d.totalSold).toBe(1);
    const all = (await getProductDetail("P001", null, null))!;
    expect(all.region).toBeNull();
    expect(all.stores).toHaveLength(3);
  });

  it("bộ đếm lọc báo phạm vi thực tế", async () => {
    await setup();
    expect((await getFacetCounts({ ...base, kv: "KV1" })).scope).toBe("region");
    expect((await getFacetCounts({ ...base, kv: "zz" })).scope).toBe("total");
    expect((await getFacetCounts({ ...base, store: "S1" })).scope).toBe("store");
  });

  it("phân tích: so sánh theo khu vực; lọc khu vực thì số tổng và bảng chỉ còn khu vực đó", async () => {
    const fx = await setup();
    await prisma.store.update({ where: { id: fx.stores[2].id }, data: { region: null } });
    const rows = await getGroupBreakdown(base, "kv");
    expect(rows.map((r) => [r.id, r.name, r.ordered])).toEqual([
      // Số mã: KV1 có P001; "chưa có khu vực" (S3) có P001, P002 → 2 mã đứng trước.
      [null, "Chưa có khu vực", 9],
      ["KV1", "KV1", 5],
    ]);
    const scoped = await getGroupBreakdown({ ...base, kv: "KV1" }, "kv");
    expect(scoped.map((r) => r.id)).toEqual(["KV1"]);
    const storeRows = await getGroupBreakdown({ ...base, kv: "KV1" }, "store");
    expect(storeRows.map((r) => r.id).sort()).toEqual(["S1", "S2"]);
    const sum = await getAnalyticsSummary({ ...base, kv: "KV1" });
    expect(sum.ordered).toBe(5);
    expect(sum.products).toBe(1);
  });

  it("khu vực số hiện 'Khu vực n' ở bảng so sánh", async () => {
    await setup();
    const rows = await getGroupBreakdown(base, "kv");
    expect(rows.find((r) => r.id === "2")?.name).toBe("Khu vực 2");
  });
});

describe("quản trị: khu vực của cửa hàng", () => {
  it("tạo/sửa: gộp khoảng trắng, rỗng → null, giữ nguyên khi không gửi", async () => {
    const s = await createStore({ code: "CH9", name: "Cửa hàng 9", region: "  3  " });
    expect(s.region).toBe("3");
    expect((await updateStore(s.id, { name: "CH chín" })).region).toBe("3");
    expect((await updateStore(s.id, { region: "" })).region).toBeNull();
    await expect(updateStore(s.id, { region: "x".repeat(41) })).rejects.toThrow(/40 ký tự/);
  });
});
