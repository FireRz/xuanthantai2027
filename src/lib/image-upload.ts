import { upload } from "@vercel/blob/client";
import { resizeImage } from "@/lib/image-resize";

/** Đường dẫn Blob của ảnh SP — dùng chung với server (`products/<mã>/image.webp`). */
export const imagePath = (sku: string, kind: "image" | "thumb") => `products/${sku}/${kind}.webp`;

export interface UploadedImage {
  imageUrl: string;
  thumbUrl: string;
}

/**
 * Thu nhỏ trên trình duyệt rồi tải THẲNG lên Vercel Blob (không đi qua server → không vướng
 * giới hạn 4,5 MB của Vercel). Server chỉ cấp token cho quản trị (/api/blob-upload).
 */
export async function resizeAndUpload(file: Blob, sku: string): Promise<UploadedImage> {
  const { image, thumb } = await resizeImage(file);
  const opts = { access: "public", handleUploadUrl: "/api/blob-upload", multipart: false } as const;
  const [full, small] = await Promise.all([
    upload(imagePath(sku, "image"), image, { ...opts, contentType: "image/webp" }),
    upload(imagePath(sku, "thumb"), thumb, { ...opts, contentType: "image/webp" }),
  ]);
  return { imageUrl: full.url, thumbUrl: small.url };
}
