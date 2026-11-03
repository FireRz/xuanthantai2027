import { prisma } from "@/server/db";
import type { FormOptions } from "./product-form";

/**
 * Lựa chọn cho form SP: chỉ mục đang hiện, cộng thêm mục SP đang dùng dù đã ẩn
 * (để mở form sửa không làm mất giá trị hiện có).
 */
export async function loadFormOptions(current?: {
  brandId: string;
  productLineId: string;
  collectionId: string | null;
  materialId: string | null;
  productTypeId: string | null;
  priceRangeId: string | null;
}): Promise<FormOptions> {
  const keep = (id: string | null | undefined) => (id ? [{ id }] : []);
  const [brands, materials, productTypes, priceRanges] = await Promise.all([
    prisma.brand.findMany({
      where: { OR: [{ active: true }, ...keep(current?.brandId)] },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        lines: {
          where: { OR: [{ active: true }, ...keep(current?.productLineId)] },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
        collections: {
          where: { OR: [{ active: true }, ...keep(current?.collectionId)] },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.material.findMany({
      where: { OR: [{ active: true }, ...keep(current?.materialId)] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.productType.findMany({
      where: { OR: [{ active: true }, ...keep(current?.productTypeId)] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.priceRange.findMany({
      where: { OR: [{ active: true }, ...keep(current?.priceRangeId)] },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { brands, materials, productTypes, priceRanges };
}
