import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  findProductsBySkus,
  listAdminProducts,
  summarizeProductsWithoutImage,
} from "@/server/services/product-admin";
import { createProduct, setProductActive } from "@/server/services/product";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("T07.4 — danh sách SP cho quản trị", () => {
  it("tìm theo mã (không phân biệt hoa/thường), thấy cả SP ẩn, lọc nhãn/trạng thái", async () => {
    const a = await makeBrandTree("Nhãn A");
    const b = await makeBrandTree("Nhãn B");
    const mk = (sku: string, t: typeof a) =>
      createProduct({ sku, brandId: t.brand.id, productLineId: t.line.id });
    const p1 = await mk("NTT001", a);
    await mk("NTT002", a);
    await mk("ABC900", b);
    await setProductActive(p1.id, false);

    expect((await listAdminProducts({})).total).toBe(3);
    expect((await listAdminProducts({ q: "ntt00" })).rows.map((r) => r.sku)).toEqual([
      "NTT001",
      "NTT002",
    ]);
    expect((await listAdminProducts({ q: "ABC" })).rows).toHaveLength(1);
    expect((await listAdminProducts({ brandId: b.brand.id })).total).toBe(1);
    expect((await listAdminProducts({ status: "hidden" })).rows.map((r) => r.sku)).toEqual([
      "NTT001",
    ]);
    expect((await listAdminProducts({ status: "active" })).total).toBe(2);
  });

  it("phân trang; trang vượt giới hạn được kẹp lại", async () => {
    const a = await makeBrandTree();
    for (let i = 1; i <= 7; i++) {
      await createProduct({ sku: `P${i}`, brandId: a.brand.id, productLineId: a.line.id });
    }
    const p2 = await listAdminProducts({ pageSize: 3, page: 2 });
    expect(p2).toMatchObject({ total: 7, pages: 3, page: 2 });
    expect(p2.rows.map((r) => r.sku)).toEqual(["P4", "P5", "P6"]);
    expect((await listAdminProducts({ pageSize: 3, page: 99 })).page).toBe(3);
  });
});

describe("T07.8 — tra SP theo mã trong tên file ảnh", () => {
  it("khớp không phân biệt hoa/thường, báo SP đã có ảnh; liệt kê SP chưa có ảnh", async () => {
    const a = await makeBrandTree();
    const mk = (sku: string) =>
      createProduct({ sku, brandId: a.brand.id, productLineId: a.line.id });
    const p1 = await mk("NTT001");
    await mk("NTT002");
    await prisma.product.update({
      where: { id: p1.id },
      data: { imageUrl: "https://x/i.webp", thumbUrl: "https://x/t.webp" },
    });
    const found = await findProductsBySkus(["ntt001", "NTT002", "KHONGCO", "ntt001"]);
    expect(found.map((r) => [r.sku, r.hasImage]).sort()).toEqual([
      ["NTT001", true],
      ["NTT002", false],
    ]);
    expect(await findProductsBySkus([])).toEqual([]);
    expect(await summarizeProductsWithoutImage()).toEqual({ count: 1, skus: ["NTT002"] });
  });
});
