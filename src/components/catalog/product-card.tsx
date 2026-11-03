import { formatInt, formatPercent, formatVnd, orDash } from "@/lib/format";
import { stockStatus } from "@/lib/status";
import type { ProductListItem } from "@/server/services/catalog";
import { ProductImage } from "./product-image";
import { ProductLink } from "./product-link";
import { StatusBadge } from "./status-badge";

/**
 * Thẻ SP gọn, ảnh to (ADR-009 U5'): nhãn trạng thái ở góc ảnh; mã · tuổi vàng; tên; giá;
 * thanh tiến độ "Về X/Y" và "Còn thiếu N". Bảng số đầy đủ chỉ ở dạng Bảng và popup.
 */
export function ProductCard({
  item,
  priority = false,
}: {
  item: ProductListItem;
  priority?: boolean;
}) {
  const { metrics: m } = item;
  const status = stockStatus(m);
  const pct = m.rate === null ? 0 : Math.round(m.rate * 100);
  return (
    <article
      data-testid="product-card"
      data-sku={item.sku}
      data-price={item.priceVnd ?? ""}
      data-shortage={m.shortage}
      className="group border-line hover:border-gold flex flex-col overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <ProductLink sku={item.sku} className="flex flex-1 flex-col">
        <div className="relative aspect-square">
          <ProductImage
            thumbUrl={item.thumbUrl}
            alt={item.name ?? item.sku}
            priority={priority}
            className="size-full"
          />
          <StatusBadge status={status} className="absolute top-2 right-2 shadow-sm" />
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="text-ink-muted text-[13px] font-medium tracking-wide uppercase md:text-[14px]">
            {item.sku} · {orDash(item.materialName)}
          </p>
          <h3 className="text-navy line-clamp-2 min-h-[2.6em] text-[15px] leading-snug font-semibold md:text-base">
            {orDash(item.name)}
          </h3>
          <p className="font-semibold whitespace-nowrap tabular-nums">{formatVnd(item.priceVnd)}</p>
          <div className="mt-1.5">
            <div
              role="progressbar"
              aria-label="Tỷ lệ hàng đã về"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="bg-gold-soft h-1.5 overflow-hidden rounded-full"
            >
              <div className="bg-gold h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[13px] tabular-nums">
              <span>
                Về{" "}
                <b className="text-navy font-semibold">
                  {formatInt(m.received)}/{formatInt(m.ordered)}
                </b>{" "}
                <span className="text-ink-muted">({formatPercent(m.rate)})</span>
              </span>
              {m.shortage > 0 && (
                <span className="text-status-short-fg font-semibold whitespace-nowrap">
                  Còn thiếu {formatInt(m.shortage)}
                </span>
              )}
            </div>
          </div>
        </div>
      </ProductLink>
    </article>
  );
}
