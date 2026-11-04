import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { parseCatalogParams, type CatalogParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { getProductNeighbors } from "@/server/services/product-neighbors";
import { fixture } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const params = (over: Partial<CatalogParams> = {}): CatalogParams => ({
  ...parseCatalogParams({}),
  ...over,
});

async function setQty(sku: string, storeId: string, ordered: number) {
  const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
  await prisma.storeProductQty.create({
    data: { productId: p.id, storeId, qtyOrdered: ordered, qtyReceived: 0 },
  });
}

describe("getProductNeighbors — SP trước/sau theo danh sách đang xem", () => {
  it("sort sku: SP giữa có prev/next liền kề, position/total đúng", async () => {
    await fixture();
    await prisma.product.update({ where: { sku: "P001" }, data: { imageUrl: "https://x/1.jpg" } });
    await prisma.product.update({ where: { sku: "P003" }, data: { thumbUrl: "https://x/3t.jpg" } });

    // Mã không phân biệt hoa/thường
    expect(await getProductNeighbors(params(), "p002")).toEqual({
      prev: "P001",
      next: "P003",
      prevImage: "https://x/1.jpg",
      nextImage: "https://x/3t.jpg",
      position: 2,
      total: 36,
    });
  });

  it("SP đầu → prev null; SP cuối → next null", async () => {
    await fixture();
    expect(await getProductNeighbors(params(), "P001")).toMatchObject({
      prev: null,
      prevImage: null,
      next: "P002",
      position: 1,
      total: 36,
    });
    expect(await getProductNeighbors(params(), "P036")).toMatchObject({
      prev: "P035",
      next: null,
      nextImage: null,
      position: 36,
      total: 36,
    });
  });

  it("theo sort price_desc và bộ lọc nhãn: thứ tự khớp listProducts với limit null", async () => {
    const fx = await fixture();
    // Giá có trùng và có SP chưa có giá (NULLS LAST, cùng giá theo mã)
    const prices = [500, null, 300, 500, 100, null, 300, 900, 200, 500, 700, null];
    for (const [i, p] of fx.products.entries())
      await prisma.product.update({ where: { sku: p.sku }, data: { priceVnd: prices[i % 12] } });

    const p = params({ sort: "price_desc", brand: [fx.brands[1].brand.id] });
    const order = (await listProducts({ ...p, limit: null })).items.map((i) => i.sku);
    expect(order).toHaveLength(18);
    for (const [i, sku] of order.entries()) {
      expect(await getProductNeighbors(p, sku)).toMatchObject({
        prev: order[i - 1] ?? null,
        next: order[i + 1] ?? null,
        position: i + 1,
        total: 18,
      });
    }
  });

  it("sku không thuộc bộ lọc / không tồn tại / bị ẩn → null", async () => {
    const fx = await fixture();
    const brandA = params({ brand: [fx.brands[0].brand.id] });
    expect(await getProductNeighbors(brandA, "P020")).toBeNull(); // SP của nhãn B
    expect(await getProductNeighbors(params({ q: "P01" }), "P020")).toBeNull();
    expect(await getProductNeighbors(params(), "KHONGCO")).toBeNull();

    await prisma.product.update({ where: { sku: "P005" }, data: { active: false } });
    expect(await getProductNeighbors(params(), "P005")).toBeNull();
    // SP ẩn không nằm trong chuỗi: P004 → P006
    expect(await getProductNeighbors(params(), "P004")).toMatchObject({
      next: "P006",
      total: 35,
    });
  });

  it("chọn cửa hàng, all=false: chỉ đi qua SP cửa hàng đó có đặt", async () => {
    const fx = await fixture();
    const s1 = fx.stores[0];
    await setQty("P003", s1.id, 2);
    await setQty("P005", s1.id, 0); // đặt = 0 → không thuộc danh sách
    await setQty("P007", s1.id, 1);
    await setQty("P010", s1.id, 4);
    await setQty("P008", fx.stores[1].id, 9); // cửa hàng khác

    const p = params({ store: "s1" });
    expect(await getProductNeighbors(p, "P007")).toEqual({
      prev: "P003",
      next: "P010",
      prevImage: null,
      nextImage: null,
      position: 2,
      total: 3,
    });
    expect(await getProductNeighbors(p, "P005")).toBeNull();
    expect(await getProductNeighbors(p, "P008")).toBeNull();

    // Xem tất cả SP của cửa hàng → mọi SP
    expect(await getProductNeighbors({ ...p, all: true }, "P005")).toMatchObject({
      prev: "P004",
      next: "P006",
      total: 36,
    });
  });
});
