import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { deleteFiles } from "@/server/storage/blob";
import { PRODUCT_IMAGE_PREFIX } from "@/server/storage/upload-policy";

/**
 * Gắn / thay ảnh SP (ADR-008 P3): mỗi SP 1 ảnh (+ thumbnail), tên file = mã SP.
 * Trình duyệt tải thẳng lên Blob rồi gọi đây với URL; ảnh cũ bị xóa khỏi Blob.
 */

const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

/** Đường dẫn Blob của ảnh SP: `products/<mã>/image.webp` và `products/<mã>/thumb.webp`. */
export const productImagePath = (sku: string, kind: "image" | "thumb") =>
  `${PRODUCT_IMAGE_PREFIX}${sku}/${kind}.webp`;

/** URL phải là file trong thư mục `products/<mã SP>/` của chính store Blob. */
export function isProductImageUrl(url: string, sku: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || !BLOB_HOST.test(u.hostname)) return false;
  const path = decodeURIComponent(u.pathname).replace(/^\//, "");
  return path.toLowerCase().startsWith(`${PRODUCT_IMAGE_PREFIX}${sku}/`.toLowerCase());
}

export async function attachProductImage(productId: string, imageUrl: string, thumbUrl: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, sku: true, imageUrl: true, thumbUrl: true },
  });
  const fresh = [imageUrl, thumbUrl];
  if (!product) {
    await deleteFiles(fresh).catch(() => {});
    throw new DomainError("PRODUCT_NOT_FOUND", "Sản phẩm không tồn tại");
  }
  if (!fresh.every((u) => isProductImageUrl(u, product.sku)) || imageUrl === thumbUrl) {
    // Không xóa file lạ: chỉ xóa nếu chắc là file ảnh SP của store mình.
    await deleteFiles(fresh.filter((u) => isProductImageUrl(u, product.sku))).catch(() => {});
    throw new DomainError("IMAGE_URL_INVALID", "Địa chỉ ảnh không hợp lệ");
  }

  try {
    await prisma.product.update({ where: { id: productId }, data: { imageUrl, thumbUrl } });
  } catch (e) {
    await deleteFiles(fresh).catch(() => {});
    throw e;
  }
  // Ảnh mới đã gắn xong mới xóa ảnh cũ; lỗi xóa không làm hỏng việc thay ảnh.
  const old = [product.imageUrl, product.thumbUrl].filter(
    (u): u is string => !!u && !fresh.includes(u),
  );
  await deleteFiles(old).catch(() => {});
  return { imageUrl, thumbUrl };
}
