import { STATUS_LABEL, type StockStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

// Nền nhạt + chữ đậm cùng tông, luôn kèm chữ (UI-DESIGN §2, §7).
const TONE: Record<StockStatus, string> = {
  full: "bg-status-full-soft text-status-full-fg",
  short: "bg-status-short-soft text-status-short-fg",
  none: "bg-status-none-soft text-status-none-fg",
  noorder: "bg-status-noorder-soft text-status-noorder-fg",
};

const DOT: Record<StockStatus, string> = {
  full: "bg-status-full",
  short: "bg-status-short",
  none: "bg-status-none",
  noorder: "bg-status-noorder",
};

export function StatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
