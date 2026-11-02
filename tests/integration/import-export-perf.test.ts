import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LARGE, seed } from "../../prisma/seed-data";
import { prisma } from "@/server/db";
import type { QuantitySheetRow } from "@/server/export/admin-workbook";
import { adminTemplate } from "@/server/services/export-admin";
import { previewImport } from "@/server/services/import";
import { applyImport } from "@/server/services/import-apply";
import { workbookBuffer } from "./excel-helpers";
import { resetDb } from "./helpers";

// T11.6: xuất ≤ 20 giây với 3.000 SP × 100 cửa hàng. T08.10: file 3.000 SP + 100.000 dòng SL — xem trước ≤ 30 giây
// (ARCHITECTURE §7); áp dụng phải nằm trong giới hạn function của gói Pro (300 giây mặc định).
const EXPORT_LIMIT_MS = Number(process.env.PERF_EXPORT_LIMIT_MS ?? 20_000);
const PREVIEW_LIMIT_MS = Number(process.env.PERF_PREVIEW_LIMIT_MS ?? 30_000);
const APPLY_LIMIT_MS = Number(process.env.PERF_APPLY_LIMIT_MS ?? 120_000);

beforeAll(async () => {
  await resetDb();
  await seed(prisma, { ...LARGE });
}, 300_000);
afterAll(() => prisma.$disconnect());

const timed = async <T>(fn: () => Promise<T>) => {
  const t = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - t };
};

describe("T11.6 / T08.10 — hiệu năng xuất và nhập Excel", () => {
  let exported: Buffer;

  it(`T11.6: xuất 3.000 SP × 100 CH (300.000 dòng SL) ≤ ${EXPORT_LIMIT_MS / 1000} giây`, async () => {
    const r = await timed(async () => workbookBuffer(await adminTemplate()));
    exported = r.value;
    console.log(
      `[perf] xuất: ${Math.round(r.ms)} ms, file ${(exported.length / 1048576).toFixed(1)} MB`,
    );
    expect(r.ms).toBeLessThanOrEqual(EXPORT_LIMIT_MS);
  }, 180_000);

  it("T08.10: nhập lại file 300.000 dòng SL vừa xuất → 0 lỗi, 0 thay đổi", async () => {
    const r = await timed(() => previewImport(exported));
    console.log(`[perf] xem trước file xuất đầy đủ (300k dòng SL): ${Math.round(r.ms)} ms`);
    expect(r.value.summary).toMatchObject({ errors: 0, changedProducts: 0, changedQuantities: 0 });
  }, 300_000);

  it(`T08.10: file 3.000 SP + 100.000 dòng SL đổi hết — xem trước ≤ ${PREVIEW_LIMIT_MS / 1000} giây, áp dụng ≤ ${APPLY_LIMIT_MS / 1000} giây`, async () => {
    const data = await adminTemplate();
    const qty: QuantitySheetRow[] = [];
    for await (const q of data.quantities) {
      qty.push({ ...q, ordered: q.ordered + 1 });
      if (qty.length === 100_000) break;
    }
    const file = await workbookBuffer({ ...data, quantities: qty });
    console.log(`[perf] file nhập: ${(file.length / 1048576).toFixed(1)} MB`);

    const preview = await timed(() => previewImport(file));
    console.log(`[perf] xem trước 3.000 SP + 100.000 dòng SL: ${Math.round(preview.ms)} ms`);
    expect(preview.value.summary).toMatchObject({ errors: 0, changedQuantities: 100_000 });
    expect(preview.ms).toBeLessThanOrEqual(PREVIEW_LIMIT_MS);

    const apply = await timed(() => applyImport(file));
    console.log(`[perf] áp dụng: ${Math.round(apply.ms)} ms`);
    expect(apply.value.quantityRows).toBe(100_000);
    expect(apply.ms).toBeLessThanOrEqual(APPLY_LIMIT_MS);

    // Sau khi áp dụng: nhập lại cùng file → không còn thay đổi nào.
    const again = await previewImport(file);
    expect(again.summary).toMatchObject({ errors: 0, changedQuantities: 0 });
  }, 600_000);
});
