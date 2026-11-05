import { prisma } from "@/server/db";
import type {
  AdminWorkbookData,
  ProductSheetRow,
  QuantitySheetRow,
  WorkbookLists,
} from "@/server/export/admin-workbook";

/**
 * Dữ liệu cho file Excel mẫu / xuất quản trị. Các danh sách chọn lấy từ dữ liệu hiện có
 * (chỉ mục đang hoạt động — mục ẩn vẫn nhập lại được, xem ghi chú trong admin-workbook).
 */

const distinctSorted = (names: string[]) =>
  [...new Set(names)].sort((a, b) => a.localeCompare(b, "vi"));

export async function loadWorkbookLists(): Promise<WorkbookLists> {
  const [brands, lines, collections, materials, types, ranges, stores] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, select: { name: true } }),
    prisma.productLine.findMany({ where: { active: true }, select: { name: true } }),
    prisma.collection.findMany({ where: { active: true }, select: { name: true } }),
    prisma.material.findMany({ where: { active: true }, select: { name: true } }),
    prisma.productType.findMany({ where: { active: true }, select: { name: true } }),
    prisma.priceRange.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    }),
    prisma.store.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { code: true },
    }),
  ]);
  return {
    brand: distinctSorted(brands.map((x) => x.name)),
    line: distinctSorted(lines.map((x) => x.name)),
    collection: distinctSorted(collections.map((x) => x.name)),
    material: distinctSorted(materials.map((x) => x.name)),
    productType: distinctSorted(types.map((x) => x.name)),
    // Khung giá giữ thứ tự theo khoảng giá (ADR-010 K3), không xếp chữ cái.
    priceRange: ranges.map((x) => x.name),
    store: stores.map((x) => x.code),
  };
}

/** File mẫu trống: có danh sách chọn từ dữ liệu hiện có (T08.5). */
export async function templateData() {
  return { lists: await loadWorkbookLists(), products: [], quantities: [] };
}

const PRODUCT_BATCH = 1000;
const QTY_BATCH = 20_000;

/** SP đang hoạt động theo mã A→Z, đọc theo lô (keyset) để không giữ cả bảng trong bộ nhớ. */
async function* exportProducts(): AsyncGenerator<ProductSheetRow> {
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.product.findMany({
      where: { active: true },
      orderBy: { sku: "asc" },
      take: PRODUCT_BATCH,
      ...(cursor ? { skip: 1, cursor: { sku: cursor } } : {}),
      select: {
        sku: true,
        name: true,
        priceVnd: true,
        brand: { select: { name: true } },
        productLine: { select: { name: true } },
        collection: { select: { name: true } },
        material: { select: { name: true } },
        productType: { select: { name: true } },
        priceRange: { select: { name: true } },
      },
    });
    if (batch.length === 0) return;
    cursor = batch[batch.length - 1].sku;
    for (const p of batch) {
      yield {
        sku: p.sku,
        name: p.name,
        brand: p.brand.name,
        line: p.productLine.name,
        collection: p.collection?.name ?? null,
        material: p.material?.name ?? null,
        productType: p.productType?.name ?? null,
        priceRange: p.priceRange?.name ?? null,
        price: p.priceVnd,
      };
    }
    if (batch.length < PRODUCT_BATCH) return;
  }
}

/** Mọi cặp (SP đang hoạt động, cửa hàng) đã có số liệu, theo (mã SP, mã CH); đọc theo lô bằng khóa (sku, code). */
async function* exportQuantities(): AsyncGenerator<QuantitySheetRow> {
  let after: { sku: string; code: string } | null = null;
  for (;;) {
    const rows: {
      sku: string;
      code: string;
      qty_ordered: number;
      qty_received: number;
      qty_sold: number;
      qty_stock: number;
    }[] = after
      ? await prisma.$queryRaw`
            SELECT p.sku, s.code, q.qty_ordered, q.qty_received, q.qty_sold, q.qty_stock
            FROM store_product_qty q
            JOIN product p ON p.id = q.product_id
            JOIN store s ON s.id = q.store_id
            WHERE p.active AND (p.sku, s.code) > (${after.sku}, ${after.code})
            ORDER BY p.sku, s.code
            LIMIT ${QTY_BATCH}`
      : await prisma.$queryRaw`
            SELECT p.sku, s.code, q.qty_ordered, q.qty_received, q.qty_sold, q.qty_stock
            FROM store_product_qty q
            JOIN product p ON p.id = q.product_id
            JOIN store s ON s.id = q.store_id
            WHERE p.active
            ORDER BY p.sku, s.code
            LIMIT ${QTY_BATCH}`;
    for (const r of rows) {
      yield {
        sku: r.sku,
        store: r.code,
        ordered: r.qty_ordered,
        received: r.qty_received,
        sold: r.qty_sold,
        stock: r.qty_stock,
      };
    }
    if (rows.length < QTY_BATCH) return;
    const last = rows[rows.length - 1];
    after = { sku: last.sku, code: last.code };
  }
}

/**
 * Xuất quản trị (T11.4): đúng mẫu nhập — SP đang hoạt động (SP ẩn không xuất; nhập lại không ảnh hưởng
 * chúng nhờ R8) và mọi cặp (SP, CH) có số liệu — nên nhập lại ngay được với 0 lỗi, 0 thay đổi (AC3).
 */
export async function adminTemplate(): Promise<AdminWorkbookData> {
  return {
    lists: await loadWorkbookLists(),
    products: exportProducts(),
    quantities: exportQuantities(),
  };
}
