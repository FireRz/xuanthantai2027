import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { parseOrThrow } from "@/lib/validation/master-data";
import { createProductSchema, updateProductSchema } from "@/lib/validation/product";
import { mapUnique } from "@/server/services/master-data/common";
import { assertSameBrand } from "@/server/services/classification";

/**
 * Service sản phẩm (ADR-008): mã SP không sửa, không xóa — chỉ ẩn / hiện. Nhận dữ liệu thô
 * (form / import), kiểm bằng schema Zod dùng chung rồi mới ghi.
 */

const duplicateSku = (sku: string) =>
  new DomainError("SKU_DUPLICATE", `Mã sản phẩm "${sku}" đã tồn tại`);

/** Kiểm các id tùy chọn có tồn tại để báo lỗi dễ hiểu thay vì lỗi khóa ngoại. */
async function assertRefsExist(input: {
  materialId: string | null;
  priceRangeId: string | null;
}): Promise<void> {
  if (
    input.materialId &&
    !(await prisma.material.findUnique({ where: { id: input.materialId } }))
  ) {
    throw new DomainError("MATERIAL_NOT_FOUND", "Tuổi vàng không tồn tại");
  }
  if (
    input.priceRangeId &&
    !(await prisma.priceRange.findUnique({ where: { id: input.priceRangeId } }))
  ) {
    throw new DomainError("PRICE_RANGE_NOT_FOUND", "Khung giá không tồn tại");
  }
}

export async function createProduct(raw: unknown) {
  const input = parseOrThrow(createProductSchema, raw, "PRODUCT_INVALID");
  if (
    await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM product WHERE UPPER(sku) = UPPER(${input.sku}) LIMIT 1`.then((r) => r.length)
  ) {
    throw duplicateSku(input.sku);
  }
  await assertSameBrand(prisma, input);
  await assertRefsExist(input);
  return mapUnique(
    () => prisma.product.create({ data: input }),
    () => duplicateSku(input.sku),
  );
}

/**
 * Sửa thông tin SP. Mã SP không nằm trong schema sửa nên mọi trường `sku` gửi kèm bị bỏ qua
 * (ADR-008 P1). Ảnh đổi riêng qua `attachProductImage`.
 */
export async function updateProduct(id: string, raw: unknown) {
  const input = parseOrThrow(updateProductSchema, raw, "PRODUCT_INVALID");
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new DomainError("PRODUCT_NOT_FOUND", "Sản phẩm không tồn tại");
  await assertSameBrand(prisma, input);
  await assertRefsExist(input);
  return prisma.product.update({ where: { id }, data: input });
}

/** Ẩn / hiện một SP (không xóa — ADR-008 P2). */
export async function setProductActive(id: string, active: boolean) {
  const r = await prisma.product.updateMany({ where: { id }, data: { active } });
  if (r.count === 0) throw new DomainError("PRODUCT_NOT_FOUND", "Sản phẩm không tồn tại");
}

/** Ẩn / hiện nhiều SP cùng lúc; trả số SP thực sự được cập nhật. */
export async function setProductsActive(ids: string[], active: boolean): Promise<number> {
  if (ids.length === 0) return 0;
  const r = await prisma.product.updateMany({ where: { id: { in: ids } }, data: { active } });
  return r.count;
}
