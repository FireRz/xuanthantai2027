import { formatInt } from "@/lib/format";
import type { TopItem } from "@/server/services/analytics";
import { ProductImage } from "../catalog/product-image";
import { ProductLink } from "../catalog/product-link";

const KIND = {
  sold: { title: "Bán chạy nhất", value: "Bán", empty: "Chưa có mã bán" },
  shortage: { title: "Còn thiếu nhiều nhất", value: "Thiếu", empty: "Không có mã thiếu" },
} as const;

/** §5.4: top 10 mã; bấm một dòng thì mở popup chi tiết SP (`?sp=`) ngay trên trang phân tích. */
export function TopList({ kind, items }: { kind: "sold" | "shortage"; items: TopItem[] }) {
  const k = KIND[kind];
  const headingId = `top-${kind}`;
  return (
    <section
      data-testid="top-list"
      data-kind={kind}
      aria-labelledby={headingId}
      className="border-line min-w-0 rounded-xl border bg-white"
    >
      <h3
        id={headingId}
        className="font-display text-navy border-line border-b px-4 py-3 text-lg font-semibold"
      >
        {k.title}
      </h3>
      {items.length === 0 ? (
        <p data-testid="top-empty" className="text-ink-muted px-4 py-6 text-center">
          {k.empty}
        </p>
      ) : (
        <ol className="divide-line divide-y">
          {items.map((it, i) => (
            <li key={it.sku} data-testid="top-item" data-sku={it.sku}>
              <ProductLink
                sku={it.sku}
                className="hover:bg-cream focus-visible:outline-brand flex items-center gap-3 px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="text-ink-muted w-5 shrink-0 text-right text-sm tabular-nums">
                  {i + 1}
                </span>
                <ProductImage
                  thumbUrl={it.thumbUrl}
                  alt={it.name ?? it.sku}
                  className="border-line size-11 shrink-0 rounded-lg border text-[10px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-ink-muted block text-xs font-medium tracking-wide uppercase">
                    {it.sku}
                  </span>
                  <span className="block truncate">{it.name ?? it.sku}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-ink-muted block text-xs">{k.value}</span>
                  <b
                    className={
                      kind === "shortage" ? "text-status-short-fg tabular-nums" : "tabular-nums"
                    }
                  >
                    {formatInt(it.value)}
                  </b>
                </span>
              </ProductLink>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
