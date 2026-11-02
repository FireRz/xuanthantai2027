import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { getFacetCounts, listProducts } from "@/server/services/catalog";
import {
  createPriceRange,
  deleteMasterItem,
  getHideImpact,
  renamePriceRange,
  setActive,
} from "@/server/services/master-data";
import { fixture } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "" };

/** Ba khung giá tạo theo thứ tự KHÔNG trùng bảng chữ cái; gán lần lượt cho SP theo thứ tự mã. */
async function withRanges() {
  const fx = await fixture();
  const hi = await createPriceRange("> 100tr");
  const lo = await createPriceRange("< 1tr");
  const mid = await createPriceRange("2tr < 5tr");
  const skus = fx.products.map((p) => p.sku);
  // P001–P009 → lo, P010–P018 → mid, P019–P027 → hi, còn lại chưa có khung giá
  const assign = async (from: number, to: number, id: string) =>
    prisma.product.updateMany({
      where: { sku: { in: skus.slice(from, to) } },
      data: { priceRangeId: id },
    });
  await assign(0, 9, lo.id);
  await assign(9, 18, mid.id);
  await assign(18, 27, hi.id);
  return { fx, hi, lo, mid, skus };
}

describe("Khung giá — danh mục (ADR-010)", () => {
  it("thêm: tên duy nhất (không phân biệt hoa/thường), thứ tự theo lúc thêm; đổi tên", async () => {
    const a = await createPriceRange("< 1tr");
    const b = await createPriceRange("  1tr   <  1.5tr ");
    expect(b.name).toBe("1tr < 1.5tr");
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder);
    await expect(createPriceRange("< 1TR")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
    await expect(renamePriceRange(b.id, "< 1tr")).rejects.toBeInstanceOf(DomainError);
    expect((await renamePriceRange(b.id, "1tr < 2tr")).name).toBe("1tr < 2tr");
  });

  it("ẩn khung giá → SP thuộc khung ẩn theo (báo số SP bị ảnh hưởng); hiện lại thì hiện lại", async () => {
    const { mid } = await withRanges();
    const before = (await listProducts({ ...base, limit: 1 })).total;
    expect(before).toBe(36);
    expect((await getHideImpact("priceRange", mid.id)).affected).toBe(9);
    expect((await setActive("priceRange", mid.id, false)).status).toBe("needs_confirmation");
    await setActive("priceRange", mid.id, false, { confirm: true });
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(before - 9);
    await setActive("priceRange", mid.id, true);
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(before);
  });

  it("đang có SP dùng thì không xóa được; chưa dùng thì xóa được", async () => {
    const { lo } = await withRanges();
    await expect(deleteMasterItem("priceRange", lo.id)).rejects.toMatchObject({ code: "IN_USE" });
    const unused = await createPriceRange("50tr < 70tr");
    await deleteMasterItem("priceRange", unused.id);
    expect(await prisma.priceRange.count({ where: { id: unused.id } })).toBe(0);
  });
});

describe("Khung giá — bộ lọc", () => {
  it("chọn nhiều khung giá = HOẶC; SP chưa có khung giá bị ẩn khi đang lọc giá", async () => {
    const { lo, mid, skus } = await withRanges();
    const one = await listProducts({ ...base, pr: [lo.id], limit: 100 });
    expect(one.items.map((i) => i.sku)).toEqual(skus.slice(0, 9));
    const two = await listProducts({ ...base, pr: [lo.id, mid.id], limit: 100 });
    expect(two.total).toBe(18);
    // Không lọc giá thì SP chưa có khung giá vẫn hiện
    expect((await listProducts({ ...base, limit: 1 })).total).toBe(36);
    expect(
      (await listProducts({ ...base, pr: [lo.id, mid.id], limit: 100 })).items.map((i) => i.sku),
    ).not.toContain(skus[30]);
  });

  it("VÀ với bộ lọc khác (nhãn)", async () => {
    const { fx, lo, skus } = await withRanges();
    const brandB = fx.brands[1].brand.id;
    const r = await listProducts({ ...base, pr: [lo.id], brand: [brandB], limit: 100 });
    // P001–P009 đều thuộc nhãn A (18 SP đầu) → không có SP nhãn B
    expect(r.total).toBe(0);
    const a = await listProducts({
      ...base,
      pr: [lo.id],
      brand: [fx.brands[0].brand.id],
      limit: 100,
    });
    expect(a.items.map((i) => i.sku)).toEqual(skus.slice(0, 9));
  });

  it("facets: khung giá theo thứ tự khoảng giá (không phải chữ cái); số đếm = số SP khi chọn khung đó", async () => {
    const { fx, lo, mid, hi } = await withRanges();
    const f = await getFacetCounts({ ...base, brand: [fx.brands[0].brand.id] });
    expect(f.pr.map((o) => o.id)).toEqual([hi.id, lo.id, mid.id]); // đúng thứ tự tạo: > 100tr, < 1tr, 2tr < 5tr
    for (const o of f.pr) {
      const r = await listProducts({
        ...base,
        brand: [fx.brands[0].brand.id],
        pr: [o.id],
        limit: 1,
      });
      expect(r.total, o.name).toBe(o.count);
    }
    // Chọn khung giá thì số đếm nhãn đổi theo nhưng số đếm khung giá không bị chính nó thu hẹp
    const g = await getFacetCounts({ ...base, pr: [lo.id] });
    expect(g.pr.map((o) => o.count)).toEqual([9, 9, 9]);
    expect(g.brand.map((o) => o.count)).toEqual([9, 0]);
    expect(g.total).toBe(9);
  });

  it("khung giá bị ẩn không còn trong danh sách lựa chọn", async () => {
    const { mid } = await withRanges();
    await setActive("priceRange", mid.id, false, { confirm: true });
    const f = await getFacetCounts(base);
    expect(f.pr.find((o) => o.id === mid.id)).toBeUndefined();
  });
});
