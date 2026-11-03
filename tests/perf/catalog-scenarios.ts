import type { PrismaClient } from "@prisma/client";
import type { getFacetCounts, listProducts } from "../../src/server/services/catalog";

type Api = { listProducts: typeof listProducts; getFacetCounts: typeof getFacetCounts };
export interface Scenario {
  name: string;
  run: (api: Api) => Promise<unknown>;
}

/** Các kiểu yêu cầu thực tế của trang xem, dựng từ dữ liệu đang có trong DB. */
export async function perfScenarios(prisma: PrismaClient): Promise<Scenario[]> {
  const [brands, lines, cols, mats, stores] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, take: 3 }),
    prisma.productLine.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.material.findMany({ orderBy: { name: "asc" } }),
    prisma.store.findMany({ orderBy: { code: "asc" }, take: 2 }),
  ]);
  const b = brands.map((x) => x.id);
  const filters = {
    brand: b.slice(0, 2),
    line: lines
      .filter((l) => b.slice(0, 2).includes(l.brandId))
      .slice(0, 2)
      .map((l) => l.id),
    col: [
      ...cols
        .filter((c) => c.brandId === b[0])
        .slice(0, 1)
        .map((c) => c.id),
      "none",
    ],
    mat: mats.slice(0, 2).map((m) => m.id),
  };
  const none = { store: null, all: false, q: "" };
  const s1 = stores[0]?.code ?? null;
  const sorts = ["sku", "updated", "price_asc", "price_desc", "shortage"] as const;

  const out: Scenario[] = [];
  for (const sort of sorts) {
    out.push({
      name: `danh sách tổng, sắp xếp ${sort}`,
      run: (a) => a.listProducts({ ...none, sort, limit: 24 }),
    });
    out.push({
      name: `danh sách tổng, sắp xếp ${sort}, tải thêm 3.000 SP`,
      run: (a) => a.listProducts({ ...none, sort, limit: 3000 }),
    });
    out.push({
      name: `danh sách cửa hàng ${s1} (xem tất cả), sắp xếp ${sort}`,
      run: (a) => a.listProducts({ ...none, store: s1, all: true, sort, limit: 24 }),
    });
  }
  out.push({
    name: "danh sách cửa hàng (chỉ SP đặt > 0)",
    run: (a) => a.listProducts({ ...none, store: s1, limit: 24 }),
  });
  out.push({
    name: "nhãn + dòng + BST (+ không thuộc BST) + tuổi vàng, còn thiếu nhiều nhất",
    run: (a) => a.listProducts({ ...none, ...filters, sort: "shortage", limit: 24 }),
  });
  out.push({
    name: "tìm mã 'ak00' + bộ lọc, giá cao → thấp",
    run: (a) => a.listProducts({ ...none, ...filters, q: "ak00", sort: "price_desc", limit: 24 }),
  });
  out.push({ name: "đếm lựa chọn: không lọc", run: (a) => a.getFacetCounts(none) });
  out.push({
    name: "đếm lựa chọn: đủ bộ lọc + tìm mã",
    run: (a) => a.getFacetCounts({ ...none, ...filters, q: "ak0" }),
  });
  out.push({
    name: "đếm lựa chọn: chọn cửa hàng (xem tất cả)",
    run: (a) => a.getFacetCounts({ ...none, store: s1, all: true, ...filters }),
  });
  out.push({
    name: "đếm lựa chọn: chọn cửa hàng (chỉ SP đặt > 0)",
    run: (a) => a.getFacetCounts({ ...none, store: s1, brand: filters.brand }),
  });
  return out;
}

export async function measureScenarios(scenarios: Scenario[], api: Api, runs = 3) {
  const results: { name: string; maxMs: number }[] = [];
  for (const s of scenarios) {
    let maxMs = 0;
    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();
      await s.run(api);
      maxMs = Math.max(maxMs, performance.now() - t0);
    }
    results.push({ name: s.name, maxMs });
  }
  return results;
}
