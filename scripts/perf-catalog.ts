/**
 * Đo thời gian lọc + đếm + sắp xếp trên DB đã seed quy mô lớn (T04.11, ADR-007: ≤ 1 giây/yêu cầu).
 *   npm run seed:large && npm run perf:catalog
 * Mỗi kịch bản chạy vài lần, lấy lần chậm nhất; vượt ngưỡng thì thoát mã 1.
 */
import "dotenv/config";
import { prisma } from "../src/server/db";
import { getFacetCounts, listProducts } from "../src/server/services/catalog";
import { measureScenarios, perfScenarios } from "../tests/perf/catalog-scenarios";

const LIMIT_MS = Number(process.env.PERF_LIMIT_MS ?? 1000);

async function main() {
  const [products, stores] = await Promise.all([prisma.product.count(), prisma.store.count()]);
  console.log(`DB: ${products} SP × ${stores} cửa hàng; ngưỡng ${LIMIT_MS} ms\n`);
  const scenarios = await perfScenarios(prisma);
  const results = await measureScenarios(scenarios, { listProducts, getFacetCounts }, 3);
  let failed = 0;
  for (const r of results) {
    const bad = r.maxMs > LIMIT_MS;
    if (bad) failed++;
    console.log(`${bad ? "✗" : "✓"} ${String(Math.round(r.maxMs)).padStart(5)} ms  ${r.name}`);
  }
  console.log(failed ? `\n${failed} kịch bản vượt ${LIMIT_MS} ms` : "\nTất cả đạt");
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => prisma.$disconnect());
