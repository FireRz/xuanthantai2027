import { formatInt } from "@/lib/format";
import { STATUS_LABEL, type StockStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

const ORDER: StockStatus[] = ["full", "short", "none", "noorder"];

const SEGMENT: Record<StockStatus, string> = {
  full: "bg-status-full",
  short: "bg-status-short",
  none: "bg-status-none",
  noorder: "bg-status-noorder",
};

// Chữ trên nền màu: nền nhạt + chữ đậm cùng tông, như StatusBadge.
const LEGEND: Record<StockStatus, string> = {
  full: "bg-status-full-soft text-status-full-fg",
  short: "bg-status-short-soft text-status-short-fg",
  none: "bg-status-none-soft text-status-none-fg",
  noorder: "bg-status-noorder-soft text-status-noorder-fg",
};

/**
 * §5.2: thanh chia 4 trạng thái không chồng nhau (độ dài theo số mã) và chú thích số mã từng
 * trạng thái; ô riêng "Hết hàng". Chỉ để đọc, không bấm được.
 */
export function StatusBar({
  status,
  soldOut,
}: {
  status: Record<StockStatus, number>;
  soldOut: number;
}) {
  const total = ORDER.reduce((n, s) => n + status[s], 0);
  return (
    <div data-testid="status-bar" className="border-line space-y-3 rounded-xl border bg-white p-4">
      <div aria-hidden className="bg-line flex h-4 overflow-hidden rounded-full">
        {ORDER.filter((s) => status[s] > 0).map((s) => (
          <span
            key={s}
            data-testid="status-segment"
            data-status={s}
            className={cn("h-full", SEGMENT[s])}
            style={{ width: `${(status[s] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ul className="flex flex-wrap gap-2" aria-label="Số mã theo trạng thái">
          {ORDER.map((s) => (
            <li
              key={s}
              data-testid="status-count"
              data-status={s}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
                LEGEND[s],
              )}
            >
              <span aria-hidden className={cn("size-2 rounded-full", SEGMENT[s])} />
              {STATUS_LABEL[s]}
              <b className="tabular-nums">{formatInt(status[s])}</b>
            </li>
          ))}
        </ul>
        <p
          data-testid="sold-out"
          className="border-status-short-fg/30 text-status-short-fg inline-flex items-center rounded-full border bg-white px-3 py-1 text-sm font-semibold whitespace-nowrap sm:ml-auto"
        >
          Hết hàng: <b className="ml-1 tabular-nums">{formatInt(soldOut)}</b>&nbsp;mã
        </p>
      </div>
    </div>
  );
}
