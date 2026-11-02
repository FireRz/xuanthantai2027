"use client";

import { ArrowUpDown } from "lucide-react";
import { SORTS, type Sort } from "@/lib/catalog-params";
import { useCatalogNav } from "./catalog-nav";

export const SORT_LABELS: Record<Sort, string> = {
  sku: "Mã SP A→Z",
  updated: "Mới cập nhật",
  price_asc: "Giá thấp → cao",
  price_desc: "Giá cao → thấp",
  shortage: "Còn thiếu nhiều nhất",
};

/** Menu sắp xếp (B8, T04.7): 5 kiểu, mặc định Mã A→Z; "Còn thiếu" tính theo phạm vi đang xem. */
export function SortMenu() {
  const { state, go } = useCatalogNav();
  return (
    <label className="flex items-center gap-2 text-[15px]">
      <ArrowUpDown className="text-ink-muted size-4 shrink-0" aria-hidden />
      <span className="sr-only md:not-sr-only md:font-medium">Sắp xếp</span>
      <select
        aria-label="Sắp xếp"
        data-testid="sort-menu"
        value={state.sort}
        onChange={(e) => go({ sort: e.target.value as Sort })}
        className="border-line focus-visible:outline-brand min-h-11 rounded-lg border bg-white px-3 focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-10"
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
      {storeSelected && <AllProductsSwitch />}
      <SortMenu />
    </>
  );
}
