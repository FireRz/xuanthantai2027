import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { getFacetCounts, listProducts } from "@/server/services/catalog";
import {
  createProductType,
  deleteMasterItem,
  getHideImpact,
  renameProductType,
  setActive,
} from "@/server/services/master-data";
import { getProductDetail } from "@/server/services/product-detail";
import { fixture } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "" };

/** Hai chủng loại; P001–P009 → nhẫn, P010–P018 → dây chuyền, còn lại chưa có chủng loại. */
async function withTypes() {
  const fx = await fixture();
  const ring = await createProductType("Nhẫn");
  const chain = await createProductType("Dây chuyền");
  const skus = fx.products.map((p) => p.sku);
  const assign = (from: number, to: number, id: string) =>
    prisma.product.updateMany({
      where: { sku: { in: skus.slice(from, to) } },
      data: { productTypeId: id },
    });
  await assign(0, 9, ring.id);
  await assign(9, 18, chain.id);
  return { fx, ring, chain, skus };
}

describe("Chủng loại — danh mục", () => {
  it("thêm: tên duy nhất (không phân biệt hoa/thường); đổi tên", async () => {
    const a = await createProductType("Nhẫn");
    const b = await createProductType("  Lắc   tay ");
    expect(b.name).toBe("Lắc tay");
    await expect(createProductType("NHẪN")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
    await expect(renameProductType(b.id, "nhẫn")).rejects.toMatchObject({
      code: "NAME_DUPLICATE",
    });
    expect((await renameProductType(a.id, "Nhẫn trơn")).name).toBe("Nhẫn trơn");
  });

  it("ẩn chủng loại → SP thuộc loại đó ẩn theo; hiện lại thì hiện lại", async () => {
    const { chain } = await withTypes();
    const before = (await listProducts({ ...base, limit: 1 })).total;
    expect((await getHideImpact("productType", chain.id)).affected).toBe(9);
    expect((await setActive("productType", chain.id, false)).status).toBe("needs_confirmation");
    await setActive("productType", chain.id, false, { confirm: true });
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(before - 9);
    await setActive("productType", chain.id, true);
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(before);
  });

  it("đang có SP dùng thì không xóa được; chưa dùng thì xóa được", async () => {
    const { ring } = await withTypes();
    await expect(deleteMasterItem("productType", ring.id)).rejects.toMatchObject({
      code: "IN_USE",
    });
    const unused = await createProductType("Bông tai");
    await deleteMasterItem("productType", unused.id);
    expect(await prisma.productType.count({ where: { id: unused.id } })).toBe(0);
  });
});

describe("Chủng loại — bộ lọc", () => {
  it("chọn nhiều = HOẶC; SP chưa có chủng loại bị ẩn khi đang lọc, hiện lại khi bỏ lọc", async () => {
    const { ring, chain, skus } = await withTypes();
    const one = await listProducts({ ...base, typ: [ring.id], limit: 100 });
    expect(one.items.map((i) => i.sku)).toEqual(skus.slice(0, 9));
    expect((await listProducts({ ...base, typ: [ring.id, chain.id], limit: 100 })).total).toBe(18);
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(36);
  });

  it("facets: số đếm = số SP khi chọn loại đó; không bị chính bộ lọc thu hẹp; VÀ với nhãn", async () => {
    const { fx, ring, chain } = await withTypes();
    const f = await getFacetCounts({ ...base, brand: [fx.brands[0].brand.id] });
    expect(f.typ.map((o) => o.name)).toEqual(["Dây chuyền", "Nhẫn"]);
    for (const o of f.typ) {
      const r = await listProducts({
        ...base,
        brand: [fx.brands[0].brand.id],
        typ: [o.id],
        limit: 1,
      });
      expect(r.total, o.name).toBe(o.count);
    }
    const g = await getFacetCounts({ ...base, typ: [ring.id] });
    expect(g.typ.map((o) => o.count)).toEqual([9, 9]);
    expect(g.total).toBe(9);
    expect(g.typ.find((o) => o.id === chain.id)?.count).toBe(9);
  });

  it("chủng loại bị ẩn không còn trong danh sách lựa chọn", async () => {
    const { chain } = await withTypes();
    await setActive("productType", chain.id, false, { confirm: true });
    const f = await getFacetCounts(base);
    expect(f.typ.find((o) => o.id === chain.id)).toBeUndefined();
  });

  it("chi tiết SP có tên chủng loại", async () => {
    const { skus } = await withTypes();
    expect((await getProductDetail(skus[0]))?.productTypeName).toBe("Nhẫn");
    expect((await getProductDetail(skus[30]))?.productTypeName).toBeNull();
  });
});

describe("Chủng loại — chip Tất cả", () => {
  it("typTotal = số SP khi bỏ riêng bộ lọc chủng loại (các bộ lọc khác vẫn áp dụng)", async () => {
    const { fx, ring } = await withTypes();
    const all = await getFacetCounts({ ...base, typ: [ring.id] });
    expect(all.total).toBe(9);
    expect(all.typTotal).toBe(36); // gồm cả SP chưa có chủng loại
    const brandA = await getFacetCounts({
      ...base,
      typ: [ring.id],
      brand: [fx.brands[0].brand.id],
    });
    expect(brandA.typTotal).toBe(
      (await getFacetCounts({ ...base, brand: [fx.brands[0].brand.id] })).total,
    );
  });
});
