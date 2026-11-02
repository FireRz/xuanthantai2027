/**
 * Thu nhỏ ảnh ngay trên trình duyệt trước khi tải lên Blob (ADR-005, ADR-006):
 * ảnh chính ≈1600px + thumbnail ≈400px, WEBP. Chỉ chạy ở trình duyệt (canvas).
 */

export const IMAGE_MAX_SIDE = 1600;
export const THUMB_MAX_SIDE = 400;
export const IMAGE_QUALITY = 0.85;
export const THUMB_QUALITY = 0.8;
/** Giới hạn dung lượng một file gửi lên (theo giới hạn 4,5 MB của Vercel). */
export const MAX_UPLOAD_BYTES = 4_500_000;
/** Ảnh gốc lớn hơn mức này không cố mở (tránh làm treo trình duyệt). */
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Kích thước sau khi thu nhỏ: giữ tỷ lệ, cạnh dài nhất ≤ max, không phóng to ảnh nhỏ. */
export function fitWithin(width: number, height: number, maxSide: number) {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Loại file có phải JPG/PNG/WEBP không (theo MIME hoặc đuôi nếu trình duyệt không báo MIME). */
export function isAcceptedImage(file: { name: string; type: string }): boolean {
  if ((ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return true;
  return !file.type && /\.(jpe?g|png|webp)$/i.test(file.name);
}

export interface ResizedImage {
  image: Blob;
  thumb: Blob;
}

function toWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b && b.type === "image/webp"
          ? resolve(b)
          : reject(new Error("Trình duyệt không xuất được ảnh WEBP")),
      "image/webp",
      quality,
    );
  });
}

function draw(source: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const { width, height } = fitWithin(source.width, source.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Đọc ảnh, tạo bản ≈1600px và thumbnail ≈400px dạng WEBP. Ném Error có thông báo tiếng Việt. */
export async function resizeImage(file: Blob): Promise<ResizedImage> {
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Ảnh quá lớn (tối đa 40 MB)");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Không đọc được ảnh (file hỏng hoặc không phải JPG/PNG/WEBP)");
  }
  try {
    const [image, thumb] = await Promise.all([
      toWebp(draw(bitmap, IMAGE_MAX_SIDE), IMAGE_QUALITY),
      toWebp(draw(bitmap, THUMB_MAX_SIDE), THUMB_QUALITY),
    ]);
    if (image.size > MAX_UPLOAD_BYTES) throw new Error("Ảnh sau khi thu nhỏ vẫn quá 4,5 MB");
    return { image, thumb };
  } finally {
    bitmap.close();
  }
}
