import type { ProductListItem } from "@/server/services/catalog";
import { ProductCard } from "./product-card";

/** Lưới thẻ SP: 2 cột điện thoại, 3 cột tablet, 4 cột máy tính (UI-DESIGN §5). */
export function ProductGrid({ items }: { items: ProductListItem[] }) {
  return (
    <ul
      data-testid="product-grid"
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4"
    >
      {items.map((item, i) => (
        <li key={item.id} className="min-w-0">
          <ProductCard item={item} priority={i < 4} />
        </li>
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
        <li
          key={i}
          className="border-line animate-pulse overflow-hidden rounded-xl border bg-white"
        >
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
