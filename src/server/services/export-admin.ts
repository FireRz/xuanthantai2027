import { prisma } from "@/server/db";
import type { WorkbookLists } from "@/server/export/admin-workbook";

/**
 * Dữ liệu cho file Excel mẫu / xuất quản trị. Các danh sách chọn lấy từ dữ liệu hiện có
 * (chỉ mục đang hoạt động — mục ẩn vẫn nhập lại được, xem ghi chú trong admin-workbook).
 */

const distinctSorted = (names: string[]) =>
  [...new Set(names)].sort((a, b) => a.localeCompare(b, "vi"));

export async function loadWorkbookLists(): Promise<WorkbookLists> {
  const [brands, lines, collections, materials, ranges, stores] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, select: { name: true } }),
    prisma.productLine.findMany({ where: { active: true }, select: { name: true } }),
    prisma.collection.findMany({ where: { active: true }, select: { name: true } }),
    prisma.material.findMany({ where: { active: true }, select: { name: true } }),
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
    // Khung giá giữ thứ tự theo khoảng giá (ADR-010 K3), không xếp chữ cái.
    priceRange: ranges.map((x) => x.name),
    store: stores.map((x) => x.code),
  };
}

/** File mẫu trống: có danh sách chọn từ dữ liệu hiện có (T08.5). */
export async function templateData() {
  return { lists: await loadWorkbookLists(), products: [], quantities: [] };
}
