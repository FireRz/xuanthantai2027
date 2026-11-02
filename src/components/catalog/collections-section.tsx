import Link from "next/link";
import { buildCatalogQuery, NO_COLLECTION, type CatalogParams } from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listCollectionCards } from "@/server/services/catalog";
import { ProductImage } from "./product-image";

/**
 * Khu "Bộ sưu tập mùa này" (ADR-009 U15): thẻ BST ảnh 4:3, bấm để lọc theo BST và cuộn tới
 * danh sách (có dải "Đang xem bộ sưu tập" ở đầu danh sách), bấm lần nữa để bỏ lọc; thẻ cuối "Ngoài bộ sưu tập".
 */
export async function CollectionsSection({ params }: { params: CatalogParams }) {
  const cards = await listCollectionCards({ store: params.store, all: params.all });
  if (cards.length === 0) return null;

  return (
    <section id="bo-suu-tap" className="scroll-mt-20 py-10 md:py-14" aria-labelledby="bst-heading">
      <h2 id="bst-heading" className="font-display text-xl font-semibold md:text-2xl">
        Bộ sưu tập mùa này
      </h2>
      <ul className="mt-5 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {cards.map((card) => {
          const key = card.id ?? NO_COLLECTION;
          const selected = params.col.length === 1 && params.col[0] === key;
          const href =
            buildCatalogQuery({ ...params, col: selected ? [] : [key], n: undefined }) || "?";
          return (
            <li key={key} className="min-w-0">
              <Link
                href={`${href}#san-pham`}
                data-testid="collection-card"
                data-collection={key}
                aria-pressed={selected}
                className={cn(
                  "group block overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md",
                  selected ? "border-brand ring-brand ring-2" : "border-line hover:border-gold",
                )}
              >
                <ProductImage
                  thumbUrl={card.thumbUrl}
                  alt={card.name}
                  className="aspect-[4/3] w-full"
                />
                <div className="p-3 md:p-4">
                  {card.brandName && (
                    <p className="text-ink-muted text-xs font-medium tracking-wide uppercase">
                      {card.brandName}
                    </p>
                  )}
                  <h3 className="font-display text-base leading-snug font-semibold md:text-xl">
                    {card.name}
                  </h3>
                  <p className="text-ink-muted mt-1 text-sm tabular-nums">
                    {formatInt(card.productCount)} SP
                  </p>
                  <p className="text-brand mt-2 text-sm font-semibold group-hover:underline">
                    {selected ? "Bỏ lọc ✕" : "Xem bộ sưu tập →"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
