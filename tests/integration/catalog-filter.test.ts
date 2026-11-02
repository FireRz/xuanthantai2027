import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { fixture, type Fx } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "" };

/** Mô hình tham chiếu viết tay cho ma trận tổ hợp. */
function expected(
  fx: Fx,
  sel: { brand: number[]; line: number[]; col: (number | "none")[]; mat: number[] },
) {
  return fx.products
    .filter((p) => {
      if (sel.brand.length && !sel.brand.includes(p.b)) return false;
      if (sel.line.length && !sel.line.includes(p.l)) return false;
      if (sel.col.length) {
        const hit = sel.col.some((c) => (c === "none" ? p.c === null : p.c === c));
        if (!hit) return false;
      }
      if (sel.mat.length && !(p.m !== null && sel.mat.includes(p.m))) return false;
      return true;
    })
    .map((p) => p.sku);
}

function subsets<T>(xs: T[]): T[][] {
  return [[], ...xs.map((x) => [x]), xs];
}

describe("T04.3 — listProducts: lọc nhiều lựa chọn", () => {
  it("ma trận tổ hợp: HOẶC trong một bộ lọc, VÀ giữa các bộ lọc, 'Không thuộc BST'", async () => {
    const fx = await fixture();
    // Dòng/BST ở hai nhãn là các id khác nhau; chọn theo chỉ số thì gom cả hai nhãn.
    const lineIds = (idx: number[]) => fx.brands.flatMap((b) => idx.map((i) => b.lines[i].id));
    const colIds = (idx: (number | "none")[]) =>
      idx.flatMap((i) => (i === "none" ? ["none"] : fx.brands.map((b) => b.cols[i].id)));

    let checked = 0;
    for (const brand of subsets([0, 1]))
      for (const line of subsets([0, 1]))
        for (const col of subsets<number | "none">([0, 1, "none"]))
          for (const mat of subsets([0, 1])) {
            const r = await listProducts({
              ...base,
              brand: brand.map((i) => fx.brands[i].brand.id),
              line: lineIds(line),
              col: colIds(col),
              mat: mat.map((i) => fx.mats[i].id),
              limit: 500,
            });
            const want = expected(fx, { brand, line, col, mat });
            expect(
              r.items.map((i) => i.sku),
              JSON.stringify({ brand, line, col, mat }),
            ).toEqual(want);
            expect(r.total).toBe(want.length);
            checked++;
          }
    expect(checked).toBe(4 * 4 * 5 * 4);
  });

  it("AC1: chọn nhiều nhãn → SP thuộc bất kỳ nhãn nào", async () => {
    const fx = await fixture();
    const one = await listProducts({ ...base, brand: [fx.brands[0].brand.id], limit: 500 });
    const both = await listProducts({
      ...base,
      brand: fx.brands.map((b) => b.brand.id),
      limit: 500,
    });
    expect(one.total).toBe(18);
    expect(both.total).toBe(36);
  });

  it("AC3: 'Không thuộc BST' trả đúng SP không có BST", async () => {
    const fx = await fixture();
    const r = await listProducts({ ...base, col: ["none"], limit: 500 });
    expect(r.items.every((i) => i.collectionName === null)).toBe(true);
    expect(r.total).toBe(fx.products.filter((p) => p.c === null).length);
  });

  it("AC6: tìm mã kết hợp được với bộ lọc", async () => {
    const fx = await fixture();
    const r = await listProducts({
      ...base,
      q: "p00",
      brand: [fx.brands[0].brand.id],
      limit: 500,
    });
    expect(r.items.map((i) => i.sku)).toEqual([
      "P001",
      "P002",
      "P003",
      "P004",
      "P005",
      "P006",
      "P007",
      "P008",
      "P009",
    ]);
  });

  it("AC5: chọn cửa hàng + bộ lọc — mặc định SP có đặt > 0, all=1 hiện mọi SP trong bộ lọc", async () => {
    const fx = await fixture();
    const [s1] = fx.stores;
    for (const sku of ["P001", "P020"]) {
      const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
      await prisma.storeProductQty.create({
        data: { productId: p.id, storeId: s1.id, qtyOrdered: 4, qtyReceived: 1 },
      });
    }
    const brandA = [fx.brands[0].brand.id];
    const r = await listProducts({ ...base, store: "S1", brand: brandA, limit: 500 });
    expect(r.items.map((i) => i.sku)).toEqual(["P001"]); // P020 thuộc nhãn B
    const all = await listProducts({ ...base, store: "S1", all: true, brand: brandA, limit: 500 });
    expect(all.total).toBe(18);
  });
});

describe("T04.3 — listProducts: sắp xếp (B8)", () => {
  async function sortFixture() {
    const brand = await prisma.brand.create({ data: { name: "N" } });
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "L" } });
    const mk = (sku: string, priceVnd: number | null) =>
      prisma.product.create({
        data: { sku, brandId: brand.id, productLineId: line.id, priceVnd },
      });
    await mk("C", 300);
    await mk("A", null);
    await mk("B", 100);
    await mk("D", 200);
    await mk("E", null);
    const sA = await prisma.store.create({ data: { code: "A", name: "A" } });
    const sB = await prisma.store.create({ data: { code: "B", name: "B" } });
    const qty = async (sku: string, s: { id: string }, o: number, r: number) => {
      const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
      await prisma.storeProductQty.create({
        data: { productId: p.id, storeId: s.id, qtyOrdered: o, qtyReceived: r },
      });
    };
    // Thiếu tổng: A = 10-3 = 7, C = 4, E = 2, B = 0, D = 0 (về dư)
    await qty("A", sA, 6, 1);
    await qty("A", sB, 4, 2);
    await qty("C", sA, 5, 1);
    await qty("D", sA, 5, 7);
    await qty("E", sB, 2, 0);
    await qty("B", sA, 3, 3);
  }
  type Sort = NonNullable<Parameters<typeof listProducts>[0]["sort"]>;
  const skus = async (sort: Sort | undefined, extra = {}) =>
    (await listProducts({ ...base, sort, limit: 50, ...extra })).items.map((i) => i.sku);

  it("mặc định và sku: Mã A→Z", async () => {
    await sortFixture();
    expect(await skus(undefined)).toEqual(["A", "B", "C", "D", "E"]);
    expect(await skus("sku")).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("giá thấp→cao và cao→thấp: SP không giá xếp cuối, cùng giá theo mã", async () => {
    await sortFixture();
    expect(await skus("price_asc")).toEqual(["B", "D", "C", "A", "E"]);
    expect(await skus("price_desc")).toEqual(["C", "D", "B", "A", "E"]);
  });

  it("còn thiếu nhiều nhất theo tổng; thiếu bằng nhau theo mã", async () => {
    await sortFixture();
    expect(await skus("shortage")).toEqual(["A", "C", "E", "B", "D"]);
  });

  it("còn thiếu nhiều nhất theo phạm vi cửa hàng", async () => {
    await sortFixture();
    // CH A: A = 5, C = 4, còn lại 0 (E không có dòng ở CH A)
    expect(await skus("shortage", { store: "A", all: true })).toEqual(["A", "C", "B", "D", "E"]);
  });

  it("mới cập nhật trước", async () => {
    await sortFixture();
    await prisma.$executeRaw`UPDATE product SET updated_at = '2026-01-01T00:00:00Z'`;
    await prisma.$executeRaw`UPDATE product SET updated_at = '2026-06-01T00:00:00Z' WHERE sku = 'D'`;
    await prisma.$executeRaw`UPDATE product SET updated_at = '2026-09-01T00:00:00Z' WHERE sku = 'B'`;
    expect(await skus("updated")).toEqual(["B", "D", "A", "C", "E"]);
  });

  it("phân trang với sắp xếp không trùng, không sót", async () => {
    await sortFixture();
    const seen: string[] = [];
    for (let offset = 0; offset < 5; offset += 2)
      seen.push(
        ...(await listProducts({ ...base, sort: "price_asc", limit: 2, offset })).items.map(
          (i) => i.sku,
        ),
      );
    expect(seen).toEqual(["B", "D", "C", "A", "E"]);
  });
});
