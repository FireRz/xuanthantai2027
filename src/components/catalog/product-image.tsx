import { cn } from "@/lib/utils";

/**
 * Ảnh SP ở danh mục: chỉ dùng thumbnail (≈400px), tải lười (T03.7, ARCHITECTURE §8).
 * Chưa có ảnh → nền kem + chữ "PNJ" mờ (UI-DESIGN §6).
 */
export function ProductImage({
  thumbUrl,
  alt,
  className,
  priority = false,
}: {
  thumbUrl: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!thumbUrl) {
    return (
      <div
        role="img"
        aria-label={`${alt} — chưa có ảnh`}
        data-placeholder
        className={cn(
          "bg-gold-soft font-display text-gold-dark/40 flex items-center justify-center text-xl font-bold tracking-wide select-none",
          className,
        )}
      >
        PNJ
      </div>
    );
  }
  return (
    // Ảnh nằm ở Vercel Blob (đã thu nhỏ khi tải lên) nên không qua next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumbUrl}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cn("bg-white object-contain", className)}
    />
  );
}
