import { formatInt, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/server/services/analytics";

/**
 * Thanh tỷ lệ 0..1 (% hàng về, % bán). Không có tỷ lệ (mẫu số 0) thì chỉ còn nền trống, không
 * đọc thành thanh tiến độ. Dùng ở ô số tổng và ở từng dòng bảng so sánh.
 */
export function RateBar({
  rate,
  label,
  tone,
  className,
}: {
  rate: number | null;
  label: string;
  tone: "navy" | "brand";
  className?: string;
}) {
  const track = cn("bg-gold-soft block h-2 overflow-hidden rounded-full", className);
  if (rate === null) return <span aria-hidden className={track} />;
  const pct = Math.round(Math.min(Math.max(rate, 0), 1) * 1000) / 10;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={formatPercent(rate)}
      data-testid="rate-bar"
      className={track}
    >
      <span
        className={cn(
          "anim-grow block h-full rounded-full",
          tone === "navy" ? "bg-navy" : "bg-brand",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

const TILES = [
  { key: "products", label: "Số mã" },
  { key: "ordered", label: "Đặt" },
  { key: "received", label: "Về" },
  { key: "shortage", label: "Thiếu" },
  { key: "sold", label: "Bán" },
  { key: "stock", label: "Tồn" },
] as const;

/** §5.1: 6 ô số tổng và 2 thanh tỷ lệ của tập SP đang lọc. */
export function SummaryTiles({ summary }: { summary: AnalyticsSummary }) {
  return (
    <div data-testid="summary-tiles" className="space-y-3">
      <dl className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {TILES.map(({ key, label }) => (
          <div
            key={key}
            data-testid="summary-tile"
            data-key={key}
            className="border-line min-w-0 rounded-xl border bg-white px-3 py-2.5 md:px-4 md:py-3"
          >
            <dt className="text-ink-muted text-xs font-semibold tracking-wide uppercase md:text-[13px]">
              {label}
            </dt>
            <dd
              className={cn(
                "font-display mt-0.5 truncate text-xl font-bold tabular-nums md:text-2xl",
                key === "shortage" && summary.shortage > 0 ? "text-status-short-fg" : "text-navy",
              )}
            >
              {formatInt(summary[key])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        <RateTile
          testId="received-rate"
          label="% hàng về"
          hint="Về / Đặt"
          rate={summary.receivedRate}
          tone="navy"
        />
        <RateTile
          testId="sell-rate"
          label="% bán"
          hint="Bán / (Bán + Tồn)"
          rate={summary.sellRate}
          tone="brand"
        />
      </div>
    </div>
  );
}

function RateTile({
  testId,
  label,
  hint,
  rate,
  tone,
}: {
  testId: string;
  label: string;
  hint: string;
  rate: number | null;
  tone: "navy" | "brand";
}) {
  return (
    <div data-testid={testId} className="border-line rounded-xl border bg-white px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="font-semibold">
          {label} <span className="text-ink-muted text-xs font-normal">({hint})</span>
        </p>
        <p
          className={cn(
            "font-display text-2xl font-bold tabular-nums",
            tone === "navy" ? "text-navy" : "text-brand",
          )}
        >
          {formatPercent(rate)}
        </p>
      </div>
      <RateBar rate={rate} label={label} tone={tone} className="h-3" />
    </div>
  );
}
