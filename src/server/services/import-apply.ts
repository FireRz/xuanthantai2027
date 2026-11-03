import { randomUUID } from "node:crypto";
import { normalizeCode } from "@/lib/excel-template";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { analyzeImport } from "@/server/import/analyze";
import { readWorkbook } from "@/server/import/read-workbook";
import { loadReference } from "./import";

/**
 * Áp dụng file nhập trong MỘT transaction (T08.9, R14): chạy lại đọc + kiểm tra trên dữ liệu hiện tại
 * (không tin bản xem trước đã cũ), còn lỗi thì từ chối, rồi ghi theo lô: SP mới → SP đổi → SL.
 * Lỗi ở bất kỳ bước nào → hoàn tác toàn bộ ("tất cả hoặc không" — AC6).
 */

export interface ApplyResult {
  newProducts: number;
  updatedProducts: number;
  quantityRows: number;
}

export interface ApplyOptions {
  /** Gọi sau mỗi bước ghi (dùng để giả lập lỗi giữa chừng trong test). */
  onStep?: (step: "products-created" | "products-updated" | "quantities-written") => void;
}

/** Khóa chặn hai lần nhập chạy chồng lên nhau. */
const IMPORT_LOCK = 7_240_001;
const PRODUCT_CHUNK = 1000;
const QTY_CHUNK = 10_000;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function applyImport(buffer: Buffer, opts: ApplyOptions = {}): Promise<ApplyResult> {
  const file = await readWorkbook(buffer);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${IMPORT_LOCK})`;
      const analysis = analyzeImport(file, await loadReference(file, tx));
      if (analysis.summary.errors > 0) {
        throw new DomainError(
          "IMPORT_HAS_ERRORS",
          `File còn ${analysis.summary.errors} lỗi — sửa file rồi tải lại, không áp dụng được.`,
        );
      }
      const { newCatalog, productUpdates, quantityWrites } = analysis.plan;

      // 0. Danh mục có trong file nhưng chưa có trên web: tạo trước, đổi id tạm → id thật
      const realId = new Map<string, string>();
      const fresh = (tempId: string) => {
        const id = randomUUID();
        realId.set(tempId, id);
        return id;
      };
      const real = (id: string) => realId.get(id) ?? id;
      const realOrNull = (id: string | null) => (id === null ? null : real(id));
      if (newCatalog.brands.length) {
        await tx.brand.createMany({
          data: newCatalog.brands.map((b) => ({ id: fresh(b.tempId), name: b.name })),
        });
      }
      if (newCatalog.lines.length) {
        await tx.productLine.createMany({
          data: newCatalog.lines.map((l) => ({
            id: fresh(l.tempId),
            brandId: real(l.brandId),
            name: l.name,
          })),
        });
      }
      if (newCatalog.collections.length) {
        await tx.collection.createMany({
          data: newCatalog.collections.map((c) => ({
            id: fresh(c.tempId),
            brandId: real(c.brandId),
            name: c.name,
          })),
        });
      }
      if (newCatalog.materials.length) {
        await tx.material.createMany({
          data: newCatalog.materials.map((m) => ({ id: fresh(m.tempId), name: m.name })),
        });
      }
      if (newCatalog.productTypes.length) {
        await tx.productType.createMany({
          data: newCatalog.productTypes.map((t) => ({ id: fresh(t.tempId), name: t.name })),
        });
      }
      if (newCatalog.priceRanges.length) {
        const max = await tx.priceRange.aggregate({ _max: { sortOrder: true } });
        const base = max._max.sortOrder ?? 0;
        await tx.priceRange.createMany({
          data: newCatalog.priceRanges.map((r, i) => ({
            id: fresh(r.tempId),
            name: r.name,
            sortOrder: base + i + 1,
          })),
        });
      }
      const resolve = <
        T extends {
          brandId: string;
          productLineId: string;
          collectionId: string | null;
          materialId: string | null;
          productTypeId: string | null;
          priceRangeId: string | null;
        },
      >(
        p: T,
      ): T => ({
        ...p,
        brandId: real(p.brandId),
        productLineId: real(p.productLineId),
        collectionId: realOrNull(p.collectionId),
        materialId: realOrNull(p.materialId),
        productTypeId: realOrNull(p.productTypeId),
        priceRangeId: realOrNull(p.priceRangeId),
      });
      const newProducts = analysis.plan.newProducts.map(resolve);
      const updates = productUpdates.map(resolve);

      // 1. SP mới (id sinh sẵn để dòng SL tham chiếu được trong cùng lô)
      const idByNewSku = new Map<string, string>();
      for (const part of chunks(newProducts, PRODUCT_CHUNK)) {
        await tx.product.createMany({
          data: part.map((p) => {
            const id = randomUUID();
            idByNewSku.set(normalizeCode(p.sku), id);
            return {
              id,
              sku: p.sku,
              name: p.name,
              brandId: p.brandId,
              productLineId: p.productLineId,
              collectionId: p.collectionId,
              materialId: p.materialId,
              productTypeId: p.productTypeId,
              priceRangeId: p.priceRangeId,
              priceVnd: p.priceVnd,
            };
          }),
        });
      }
      opts.onStep?.("products-created");

      // 2. SP đã có: ghi đè các trường (ô trống đã được gộp giữ nguyên ở bước phân tích)
      for (const part of chunks(updates, PRODUCT_CHUNK)) {
        // Các cột có thể rỗng truyền dạng text[] rồi ép kiểu từng phần tử: Prisma gán mảng toàn null là int[].
        await tx.$executeRaw`
          UPDATE product p SET
            name = v.name, brand_id = v.brand_id, product_line_id = v.line_id,
            collection_id = v.collection_id::uuid, material_id = v.material_id::uuid,
            product_type_id = v.product_type_id::uuid, price_range_id = v.price_range_id::uuid, price_vnd = v.price_vnd, updated_at = now()
          FROM unnest(
            ${part.map((p) => p.id)}::uuid[], ${part.map((p) => p.name)}::text[],
            ${part.map((p) => p.brandId)}::uuid[], ${part.map((p) => p.productLineId)}::uuid[],
            ${part.map((p) => p.collectionId)}::text[], ${part.map((p) => p.materialId)}::text[],
            ${part.map((p) => p.productTypeId)}::text[], ${part.map((p) => p.priceRangeId)}::text[], ${part.map((p) => p.priceVnd)}::int[]
          ) AS v(id, name, brand_id, line_id, collection_id, material_id, product_type_id, price_range_id, price_vnd)
          WHERE p.id = v.id`;
      }
      opts.onStep?.("products-updated");

      // 3. SL: upsert ghi đè
      const rows = quantityWrites.map((w) => {
        const productId = w.productId ?? idByNewSku.get(w.newSku ?? "");
        if (!productId) throw new DomainError("IMPORT_INTERNAL", "Không xác định được sản phẩm");
        return { productId, storeId: w.storeId, ordered: w.ordered,
          received: w.received,
          sold: w.sold,
          stock: w.stock,
        };
      });
      for (const part of chunks(rows, QTY_CHUNK)) {
        await tx.$executeRaw`
          INSERT INTO store_product_qty (product_id, store_id, qty_ordered, qty_received, qty_sold, qty_stock, updated_at)
          SELECT product_id, store_id, ordered, received, sold, stock, now()
          FROM unnest(
            ${part.map((r) => r.productId)}::uuid[], ${part.map((r) => r.storeId)}::uuid[],
            ${part.map((r) => r.ordered)}::int[], ${part.map((r) => r.received)}::int[],
            ${part.map((r) => r.sold)}::int[], ${part.map((r) => r.stock)}::int[]
          ) AS v(product_id, store_id, ordered, received, sold, stock)
          ON CONFLICT (product_id, store_id) DO UPDATE SET
            qty_ordered = EXCLUDED.qty_ordered, qty_received = EXCLUDED.qty_received,
            qty_sold = EXCLUDED.qty_sold, qty_stock = EXCLUDED.qty_stock,
            updated_at = now()`;
      }
      opts.onStep?.("quantities-written");

      return {
        newProducts: newProducts.length,
        updatedProducts: updates.length,
        quantityRows: rows.length,
      } satisfies ApplyResult;
    },
    // File lớn (3.000 SP + 100.000 dòng SL) cần nhiều thời gian hơn mặc định 5 giây.
    { timeout: 240_000, maxWait: 15_000 },
  );
}
