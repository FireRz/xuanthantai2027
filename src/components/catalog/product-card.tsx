import { formatInt, formatPercent, formatVnd, orDash } from "@/lib/format";
import { sellThrough } from "@/lib/metrics";
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
  const outOfStock = item.stock === 0 && m.received > 0;
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
        <div className="relative aspect-square overflow-hidden [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-105">
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
              <div className="bg-gold anim-grow h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            {/* Thẻ hẹp (2 cột điện thoại): "Còn thiếu" xuống dòng riêng thay vì tràn khỏi thẻ. */}
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-[13px] tabular-nums">
              <span className="whitespace-nowrap">
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
            <p className="text-ink-muted mt-1 text-[13px] tabular-nums">
              Bán <b className="text-navy font-semibold">{formatInt(item.sold)}</b>
              {" · "}
              Tồn{" "}
              <b
                className={
                  outOfStock ? "text-status-short-fg font-bold" : "text-navy font-semibold"
                }
              >
                {formatInt(item.stock)}
              </b>
              {" · "}
              <span>{formatPercent(sellThrough(item.sold, item.stock))}</span>
            </p>
          </div>
        </div>
      </ProductLink>
    </article>
  );
}
