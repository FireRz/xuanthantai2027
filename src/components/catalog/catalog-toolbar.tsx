"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import { SORTS, type Sort } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";

export const SORT_LABELS: Record<Sort, string> = {
  sku: "Mã SP A→Z",
  updated: "Mới cập nhật",
  price_asc: "Giá thấp → cao",
  price_desc: "Giá cao → thấp",
  shortage: "Còn thiếu nhiều nhất",
  sold: "Bán chạy nhất",
};

/** Menu sắp xếp (B8, T04.7): 6 kiểu, mặc định Mã A→Z; "Còn thiếu" tính theo phạm vi đang xem. */
export function SortMenu({
  testId = "sort-menu",
  compact = false,
}: {
  testId?: string;
  /** Bỏ chữ "Sắp xếp:" và giãn hết bề ngang (cột lọc hẹp bên trái). */
  compact?: boolean;
}) {
  const { state, go } = useCatalogNav();
  return (
    <label
      className={cn(
        "border-line focus-within:outline-brand relative inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border bg-white px-4 text-[15px] font-medium whitespace-nowrap focus-within:outline-2 focus-within:outline-offset-2 md:min-h-10",
        compact && "w-full",
      )}
    >
      <ArrowUpDown className="size-4 shrink-0" aria-hidden />
      {!compact && <span className="text-ink-muted hidden md:inline">Sắp xếp:</span>}
      <span className={cn(compact && "flex-1")}>{SORT_LABELS[state.sort]}</span>
      <ChevronDown className="size-4 shrink-0" aria-hidden />
      <select
        aria-label="Sắp xếp"
        data-testid={testId}
        value={state.sort}
        onChange={(e) => go({ sort: e.target.value as Sort })}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Công tắc "Xem tất cả SP" (B7, ADR-002 D6): chỉ hiện khi đã chọn cửa hàng.
 * Tắt: chỉ SP cửa hàng đó đặt > 0; bật: mọi SP (SP chưa đặt hiện 0).
 */
export function AllProductsSwitch() {
  const { state, go } = useCatalogNav();
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-medium select-none">
      <span className="relative inline-block h-6 w-11 shrink-0">
        <input
          type="checkbox"
          role="switch"
          data-testid="all-switch"
          checked={state.all}
          onChange={(e) => go({ all: e.target.checked })}
          className="peer absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden
          className="bg-line peer-checked:bg-brand peer-focus-visible:outline-brand pointer-events-none absolute inset-0 rounded-full transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
        />
      </span>
      Xem tất cả SP
    </label>
  );
}

export function CatalogToolbar({ storeSelected }: { storeSelected: boolean }) {
  return (
    <>
      {storeSelected && (
        <div className="hidden md:block">
          <AllProductsSwitch />
        </div>
      )}
      <SortMenu />
    </>
  );
}
