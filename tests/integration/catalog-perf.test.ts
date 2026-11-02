import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LARGE, seed } from "../../prisma/seed-data";
import { prisma } from "@/server/db";
import { getFacetCounts, listProducts } from "@/server/services/catalog";
import { measureScenarios, perfScenarios } from "../perf/catalog-scenarios";
import { resetDb } from "./helpers";

// Ngưỡng ADR-007 / ARCHITECTURE §7: lọc, đếm, sắp xếp ≤ 1 giây với 3.000 SP × 100 cửa hàng.
const LIMIT_MS = Number(process.env.PERF_LIMIT_MS ?? 1000);

beforeAll(async () => {
  await resetDb();
  await seed(prisma, { ...LARGE });
}, 300_000);
afterAll(() => prisma.$disconnect());

describe("T04.11 — hiệu năng lọc + đếm + sắp xếp trên seed lớn", () => {
  it("seed đủ 3.000 SP × 100 cửa hàng × 100% ma trận", async () => {
    expect(await prisma.product.count()).toBe(3000);
    expect(await prisma.store.count()).toBe(100);
    expect(await prisma.storeProductQty.count()).toBe(300_000);
  });

  it(`mọi kịch bản ≤ ${LIMIT_MS} ms mỗi yêu cầu`, async () => {
    const scenarios = await perfScenarios(prisma);
    const results = await measureScenarios(scenarios, { listProducts, getFacetCounts }, 3);
    const slow = results.filter((r) => r.maxMs > LIMIT_MS);
    expect(slow.map((r) => `${r.name}: ${Math.round(r.maxMs)} ms`)).toEqual([]);
    expect(results.length).toBeGreaterThanOrEqual(20);
  }, 120_000);
});
