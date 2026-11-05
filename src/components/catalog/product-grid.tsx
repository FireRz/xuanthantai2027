import type { ProductListItem } from "@/server/services/catalog";
import { CoachHint } from "./coach-hints";
import { ProductCard } from "./product-card";
import { RevealItem } from "./reveal";

/** Lưới thẻ SP: 2 cột điện thoại, 3 cột tablet, 4 cột máy tính (UI-DESIGN §5). */
export function ProductGrid({
  items,
  photo = false,
}: {
  items: ProductListItem[];
  photo?: boolean;
}) {
  return (
    <ul
      data-testid="product-grid"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      {items.map((item, i) => (
        <RevealItem
          key={item.id}
          // Thẻ đầu nổi lên khi có gợi ý: bong bóng rộng hơn thẻ, không được nằm dưới thẻ bên cạnh.
          className={i === 0 ? "relative min-w-0 has-[[role=tooltip]]:z-10" : "min-w-0"}
          delay={(i % 4) * 70}
        >
          <ProductCard item={item} priority={i < 4} photo={photo} />
          {i === 0 && (
            <CoachHint
              id="card"
              title="Xem chi tiết sản phẩm"
              arrow="none"
              className="top-14 left-2"
            >
              {photo
                ? "Bấm vào thẻ để xem ảnh lớn và thông tin sản phẩm."
                : "Bấm vào thẻ để xem ảnh lớn và số lượng theo từng cửa hàng."}
            </CoachHint>
          )}
        </RevealItem>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul
      data-testid="product-skeleton"
      aria-busy="true"
      aria-label="Đang tải sản phẩm"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="border-line shimmer overflow-hidden rounded-xl border bg-white">
          <div className="bg-gold-soft aspect-square" />
          <div className="space-y-2 p-3">
            <div className="bg-line h-3 w-1/2 rounded" />
            <div className="bg-line h-4 w-4/5 rounded" />
            <div className="bg-line h-4 w-1/3 rounded" />
            <div className="bg-gold-soft h-1.5 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
