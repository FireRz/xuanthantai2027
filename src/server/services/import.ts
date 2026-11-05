import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeCode } from "@/lib/excel-template";
import { PREVIEW_DETAIL_LIMIT, type ImportPreview } from "@/lib/import-types";
import { prisma } from "@/server/db";
import { analyzeImport, type ImportAnalysis, type ReferenceData } from "@/server/import/analyze";
import { readWorkbook, type WorkbookData } from "@/server/import/read-workbook";

/**
 * Nhập Excel (F08): đọc file → đối chiếu dữ liệu hiện có → phân loại (T08.7) → xem trước (T08.8).
 * Áp dụng chạy lại đúng các bước này rồi mới ghi, nên không bao giờ ghi theo bản xem trước đã cũ.
 */

type Db = PrismaClient | Prisma.TransactionClient;

/** Dữ liệu hiện có cần cho việc đối chiếu; SL chỉ đọc cho những SP có trong sheet SoLuong. */
export async function loadReference(file: WorkbookData, db: Db = prisma): Promise<ReferenceData> {
  const [brands, lines, collections, materials, productTypes, priceRanges, stores, products] =
    await Promise.all([
      db.brand.findMany({ select: { id: true, name: true } }),
      db.productLine.findMany({ select: { id: true, brandId: true, name: true } }),
      db.collection.findMany({ select: { id: true, brandId: true, name: true } }),
      db.material.findMany({ select: { id: true, name: true } }),
      db.productType.findMany({ select: { id: true, name: true } }),
      db.priceRange.findMany({ select: { id: true, name: true } }),
      db.store.findMany({ select: { id: true, code: true } }),
      db.product.findMany({
        select: {
          id: true,
          sku: true,
          name: true,
          brandId: true,
          productLineId: true,
          collectionId: true,
          materialId: true,
          productTypeId: true,
          priceRangeId: true,
          priceVnd: true,
        },
      }),
    ]);

  const idBySku = new Map(products.map((p) => [normalizeCode(p.sku), p.id]));
  const wantedIds = new Set<string>();
  for (const r of file.quantities?.rows ?? []) {
    const id = r.cells.sku === undefined ? undefined : idBySku.get(normalizeCode(r.cells.sku));
    if (id) wantedIds.add(id);
  }
  const quantities =
    wantedIds.size === 0
      ? []
      : (
          await db.$queryRaw<
            {
              product_id: string;
              store_id: string;
              qty_ordered: number;
              qty_received: number;
              qty_sold: number;
              qty_stock: number;
            }[]
          >`SELECT product_id, store_id, qty_ordered, qty_received, qty_sold, qty_stock FROM store_product_qty
            WHERE product_id = ANY(${[...wantedIds]}::uuid[])`
        ).map((q) => ({
          productId: q.product_id,
          storeId: q.store_id,
          ordered: q.qty_ordered,
          received: q.qty_received,
          sold: q.qty_sold,
          stock: q.qty_stock,
        }));

  return {
    brands,
    lines,
    collections,
    materials,
    productTypes,
    priceRanges,
    stores,
    products,
    quantities,
  };
}

/** Đọc + đối chiếu + phân loại: dùng chung cho xem trước và áp dụng. */
export async function analyzeFile(buffer: Buffer, db: Db = prisma): Promise<ImportAnalysis> {
  const file = await readWorkbook(buffer);
  return analyzeImport(file, await loadReference(file, db));
}

/** Bản xem trước gửi về trình duyệt: số liệu tổng đủ, chi tiết cắt ở PREVIEW_DETAIL_LIMIT mỗi loại. */
export function toPreview(a: ImportAnalysis, limit = PREVIEW_DETAIL_LIMIT): ImportPreview {
  return {
    summary: a.summary,
    sheets: a.sheets,
    issues: a.issues.slice(0, limit),
    productItems: a.productItems.slice(0, limit),
    quantityItems: a.quantityItems.slice(0, limit),
    newCatalog: a.newCatalogLabels.slice(0, limit),
    truncated: {
      issues: a.issues.length > limit,
      productItems: a.productItems.length > limit,
      quantityItems: a.quantityItems.length > limit,
    },
  };
}

export async function previewImport(buffer: Buffer): Promise<ImportPreview> {
  return toPreview(await analyzeFile(buffer));
}
