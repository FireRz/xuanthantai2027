import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { getFacetCounts, listProducts } from "@/server/services/catalog";
import { fixture } from "./catalog-fixture";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const base = { store: null, all: false, q: "" };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("T04.4 — catalog.getFacetCounts", () => {
  it("không lọc: số đếm = số SP thực; BST có 'Không thuộc BST'", async () => {
    const fx = await fixture();
    const f = await getFacetCounts(base);
    expect(f.brand.map((o) => o.count)).toEqual([18, 18]);
    expect(f.line).toHaveLength(4);
    expect(f.line.every((o) => o.count === 9)).toBe(true);
    expect(f.col.at(-1)).toMatchObject({ id: "none", name: "Không thuộc BST" });
    expect(f.col.at(-1)?.count).toBe(fx.products.filter((p) => p.c === null).length);
    expect(f.mat.map((o) => o.count)).toEqual([12, 12]);
    expect(f.store.map((o) => o.count)).toEqual([0, 0, 0]);
  });

  it("B3: chọn nhãn → Dòng và BST chỉ còn của nhãn đó (kể cả khi chưa có SP)", async () => {
    const fx = await fixture();
    const f = await getFacetCounts({ ...base, brand: [fx.brands[1].brand.id] });
    expect(ids(f.line).sort()).toEqual(fx.brands[1].lines.map((l) => l.id).sort());
    expect(f.line.every((o) => o.brandId === fx.brands[1].brand.id)).toBe(true);
    expect(
      f.col.filter((o) => o.id !== "none").every((o) => o.brandId === fx.brands[1].brand.id),
    ).toBe(true);
    // Bộ lọc Nhãn không bị tự giới hạn bởi lựa chọn của chính nó
    expect(f.brand).toHaveLength(2);
  });

  it("B3: chọn BST → Dòng chỉ còn dòng có SP trong BST đó (số đếm 0 với dòng khác)", async () => {
    const fx = await fixture();
    const bst = fx.brands[0].cols[0];
    // Làm dòng 'Dây' của nhãn A không còn SP nào trong BST 1
    await prisma.product.deleteMany({
      where: { collectionId: bst.id, productLineId: fx.brands[0].lines[1].id },
    });
    const f = await getFacetCounts({ ...base, col: [bst.id] });
    const withProducts = f.line.filter((o) => o.count > 0).map((o) => o.id);
    expect(withProducts).toEqual([fx.brands[0].lines[0].id]);
    expect(f.line.find((o) => o.id === fx.brands[0].lines[1].id)?.count).toBe(0);
  });

  it("AC4: số đếm cạnh mỗi lựa chọn = số SP nhận được khi chọn lựa chọn đó (mọi bộ lọc, có bộ lọc khác)", async () => {
    const fx = await fixture();
    const sel = {
      brand: [fx.brands[0].brand.id],
      col: [fx.brands[0].cols[0].id, "none"],
      mat: [fx.mats[0].id],
      q: "p0",
    };
    const f = await getFacetCounts({ ...base, ...sel });
    const total = (extra: object) =>
      listProducts({ ...base, ...sel, ...extra, limit: 1 }).then((r) => r.total);

    for (const o of f.brand)
      expect(await total({ brand: [o.id] }), `brand ${o.name}`).toBe(o.count);
    for (const o of f.line) expect(await total({ line: [o.id] }), `line ${o.name}`).toBe(o.count);
    for (const o of f.col) expect(await total({ col: [o.id] }), `col ${o.name}`).toBe(o.count);
    for (const o of f.mat) expect(await total({ mat: [o.id] }), `mat ${o.name}`).toBe(o.count);
  });

  it("AC4 cho cửa hàng: số đếm = số SP khi vừa chọn cửa hàng đó; theo bộ lọc khác", async () => {
    const fx = await fixture();
    const grant = async (sku: string, store: number, o: number) => {
      const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
      await prisma.storeProductQty.create({
        data: { productId: p.id, storeId: fx.stores[store].id, qtyOrdered: o, qtyReceived: 0 },
      });
    };
    await grant("P001", 0, 3);
    await grant("P002", 0, 0); // đặt = 0 → không tính
    await grant("P003", 0, 1);
    await grant("P020", 0, 2); // nhãn B
    await grant("P001", 1, 5);

    const all = await getFacetCounts(base);
    expect(all.store.map((o) => [o.id, o.count])).toEqual([
      ["S1", 3],
      ["S2", 1],
      ["S3", 0],
    ]);

    const brandA = { brand: [fx.brands[0].brand.id] };
    const f = await getFacetCounts({ ...base, ...brandA });
    for (const o of f.store) {
      const r = await listProducts({ ...base, ...brandA, store: o.id });
      expect(r.total, o.id).toBe(o.count);
    }
    expect(f.store.map((o) => o.count)).toEqual([2, 1, 0]);
  });

  it("đang chọn cửa hàng: số đếm của các bộ lọc khác theo SP cửa hàng đó đặt > 0 (all=0), hoặc mọi SP (all=1)", async () => {
    const fx = await fixture();
    for (const sku of ["P001", "P020"]) {
      const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
      await prisma.storeProductQty.create({
        data: { productId: p.id, storeId: fx.stores[0].id, qtyOrdered: 2, qtyReceived: 1 },
      });
    }
    const f = await getFacetCounts({ ...base, store: "S1" });
    expect(f.brand.map((o) => o.count)).toEqual([1, 1]);
    const fAll = await getFacetCounts({ ...base, store: "S1", all: true });
    expect(fAll.brand.map((o) => o.count)).toEqual([18, 18]);
    // Danh sách cửa hàng vẫn đủ để đổi chọn
    expect(f.store).toHaveLength(3);
  });

  it("tìm mã thu hẹp số đếm; ẩn nhãn/dòng/BST/chất liệu/cửa hàng thì không còn trong danh sách", async () => {
    const fx = await fixture();
    const f = await getFacetCounts({ ...base, q: "P001" });
    expect(f.brand.map((o) => o.count)).toEqual([1, 0]);

    await prisma.material.update({ where: { id: fx.mats[0].id }, data: { active: false } });
    await prisma.collection.update({
      where: { id: fx.brands[0].cols[0].id },
      data: { active: false },
    });
    await prisma.productLine.update({
      where: { id: fx.brands[0].lines[0].id },
      data: { active: false },
    });
    await prisma.store.update({ where: { id: fx.stores[2].id }, data: { active: false } });
    const g = await getFacetCounts(base);
    expect(g.mat).toHaveLength(1);
    expect(g.col.find((o) => o.id === fx.brands[0].cols[0].id)).toBeUndefined();
    expect(g.line.find((o) => o.id === fx.brands[0].lines[0].id)).toBeUndefined();
    expect(g.store).toHaveLength(2);
    // SP thuộc BST/dòng/chất liệu bị ẩn không được đếm vào nhãn
    expect(g.brand[0].count).toBeLessThan(18);
  });
});
