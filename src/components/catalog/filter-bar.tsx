"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  countGroupFilters,
  hasActiveFilter,
  visibleSorts,
  type CatalogParams,
} from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FacetCounts, FacetOption } from "@/server/services/catalog-facets";
import { toggleId, useCatalogNav } from "./catalog-nav";
import { SORT_LABELS } from "./catalog-toolbar";
import { FilterDock, scrollToResults, useDocked } from "./filter-dock";
import {
  ActiveFilters,
  CLEAR_ALL,
  FilterDropdown,
  GROUPS,
  labelOf,
  removeChip,
  selectedChips,
  SHEET_GROUPS,
  shown,
  type SelectedChip,
  type SheetKey,
} from "./filter-parts";

/**
 * Bộ lọc (ADR-009 U8'): nút thả xuống Nhãn hàng / Dòng / BST / Tuổi vàng / Khung giá (chọn nhiều,
 * số đếm, nút "Xem N SP"); điện thoại: bảng lọc trượt từ dưới lên với các chip.
 * Chọn tới đâu áp dụng tới đó lên URL (B9); số đếm là của máy chủ (B4).
 * Cuộn qua thanh này thì bộ lọc đi theo (FilterDock): cột trái trên màn rộng, thanh gọn dính trên màn hẹp.
 */
export function FilterBar({
  facets,
  toolbar,
  sheetExtra,
  showSort = true,
}: {
  facets: FacetCounts;
  /** Sắp xếp + công tắc "Xem tất cả SP" (T04.7, T04.8); điện thoại chỉ còn nút sắp xếp. */
  toolbar?: React.ReactNode;
  /** Mục thêm trong bảng lọc điện thoại (công tắc "Xem tất cả SP"). */
  sheetExtra?: React.ReactNode;
  /** Có sắp xếp (bảng lọc điện thoại, thanh dính, cột trái); trang phân tích tắt đi. */
  showSort?: boolean;
}) {
  const owned = (xs: FacetOption[]) =>
    xs.filter((o) => o.brandId).map((o) => ({ id: o.id, brandId: o.brandId as string }));
  const { state, go: navigate, pending } = useCatalogNav();
  const root = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const docked = useDocked(root, dock);
  const go = (patch: Partial<CatalogParams>) => {
    if (docked) scrollToResults(dock);
    navigate(patch, { owned: { lines: owned(facets.line), cols: owned(facets.col) } });
  };
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggle = (key: SheetKey, id: string) => go({ [key]: toggleId(state[key], id) });
  const groupCount = countGroupFilters(state);
  const chips = selectedChips(facets, state);
  const clearAll = () => go(CLEAR_ALL);
  const removeOne = (c: SelectedChip) => go(removeChip(c, state));

  return (
    <div
      ref={root}
      data-testid="filter-bar"
      aria-busy={pending}
      className={cn("relative space-y-3", pending && "opacity-90")}
    >
      {/* Máy tính: 5 nút thả xuống + công tắc + sắp xếp. Điện thoại: một hàng Lọc + Sắp xếp, mọi bộ lọc nằm trong bảng Lọc. */}
      <div className="flex items-center gap-2 md:flex-wrap">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          data-testid="open-filter-sheet"
          className="border-brand text-brand focus-visible:outline-brand inline-flex min-h-11 items-center gap-2 rounded-full border-2 bg-white px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Lọc{groupCount > 0 && <span data-testid="filter-count"> ({groupCount})</span>}
        </button>
        {GROUPS.map(({ key, label }) => (
          <div key={key} className="hidden md:block">
            <FilterDropdown
              label={label}
              options={facets[key]}
              selected={state[key]}
              total={facets.total}
              onToggle={(id) => toggle(key, id)}
            />
          </div>
        ))}
        {toolbar && (
          <div className="ml-auto flex items-center justify-end gap-x-4 gap-y-2 md:flex-wrap">
            {toolbar}
          </div>
        )}
      </div>

      <TypeChips
        options={facets.typ}
        total={facets.typTotal}
        selected={state.typ}
        onToggle={(id) => go({ typ: toggleId(state.typ, id) })}
        onAll={() => go({ typ: [] })}
      />

      {/* Máy tính thấy Chủng loại ngay trên hàng chip; điện thoại thì hiện ở dải này. */}
      <ActiveFilters
        chips={chips.map((c) => (c.key === "typ" ? { ...c, className: "md:hidden" } : c))}
        showClear={hasActiveFilter(state)}
        onRemove={removeOne}
        onClear={clearAll}
        testId="active-filters"
        clearTestId="clear-filters"
      />

      <FilterDock
        dockRef={dock}
        docked={docked}
        facets={facets}
        state={state}
        pending={pending}
        chips={chips}
        onToggle={toggle}
        onRemove={removeOne}
        onClear={clearAll}
        onOpenSheet={() => setSheetOpen(true)}
        extra={sheetExtra}
        showSort={showSort}
      />

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        facets={facets}
        state={state}
        pending={pending}
        onToggle={toggle}
        onSort={showSort ? (sort) => go({ sort }) : undefined}
        onClear={() => go({ brand: [], line: [], col: [], mat: [], typ: [], pr: [] })}
        extra={sheetExtra}
      />
    </div>
  );
}

/**
 * Hàng chip Chủng loại: "Tất cả (N)" rồi từng loại kèm số đếm, chọn nhiều loại cùng lúc.
 * Chỉ hiện trên máy tính (xuống dòng khi dài); điện thoại chọn trong bảng Lọc. Tên loại màu xanh navy.
 */
function TypeChips({
  options,
  total,
  selected,
  onToggle,
  onAll,
}: {
  options: FacetOption[];
  total: number;
  selected: string[];
  onToggle: (id: string) => void;
  onAll: () => void;
}) {
  if (options.length === 0) return null;
  const chip = (active: boolean, dim: boolean) =>
    cn(
      "focus-visible:outline-brand inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 whitespace-nowrap focus-visible:outline-2",
      active ? "bg-brand border-brand text-white" : "border-line bg-white",
      dim && !active && "opacity-55",
    );
  const label = (active: boolean) => (active ? "font-bold" : "text-navy font-bold");
  const count = (active: boolean) =>
    cn("tabular-nums", active ? "text-white/90" : "text-ink-muted");
  return (
    <div
      data-testid="type-chips"
      role="group"
      aria-label="Chủng loại"
      className="hidden flex-wrap gap-2 md:flex"
    >
      <button
        type="button"
        aria-pressed={selected.length === 0}
        onClick={onAll}
        data-testid="type-chip-all"
        className={chip(selected.length === 0, false)}
      >
        <span className={label(selected.length === 0)}>Tất cả</span>
        <span className={count(selected.length === 0)}>({formatInt(total)})</span>
      </button>
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.id)}
            data-testid="type-chip"
            className={chip(active, o.count === 0)}
          >
            <span className={label(active)}>{o.name}</span>
            <span className={count(active)}>({formatInt(o.count)})</span>
          </button>
        );
      })}
    </div>
  );
}

/** Bảng lọc trượt từ dưới lên cho điện thoại; dùng <dialog> gốc (khóa focus, Esc đóng). */
function FilterSheet({
  open,
  onClose,
  facets,
  state,
  pending,
  onToggle,
  onSort,
  onClear,
  extra,
}: {
  open: boolean;
  onClose: () => void;
  facets: FacetCounts;
  state: CatalogParams;
  pending: boolean;
  onToggle: (key: SheetKey, id: string) => void;
  /** Không có thì bảng lọc không có mục Sắp xếp. */
  onSort?: (sort: CatalogParams["sort"]) => void;
  onClear: () => void;
  extra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Bộ lọc"
      data-testid="filter-sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="animate-in slide-in-from-bottom fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-white p-0 shadow-2xl duration-200 backdrop:bg-black/45 open:flex open:flex-col md:hidden"
    >
      <div className="border-line flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-display text-lg font-semibold">Bộ lọc</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bộ lọc"
          className="focus-visible:outline-brand grid size-11 place-items-center rounded-full focus-visible:outline-2"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {extra}
        {SHEET_GROUPS.map(({ key, label }) => {
          const all = facets[key];
          const list = shown(all);
          return (
            <fieldset key={key} className="space-y-2">
              <legend className="text-ink-muted mb-1 text-sm font-semibold">{label}</legend>
              <div className="flex flex-wrap gap-2">
                {list.length === 0 && (
                  <p className="text-ink-muted text-sm">Không có lựa chọn phù hợp</p>
                )}
                {list.map((o) => (
                  <SheetChip
                    key={o.id}
                    label={labelOf(o, all)}
                    count={o.count}
                    selected={state[key].includes(o.id)}
                    onClick={() => onToggle(key, o.id)}
                  />
                ))}
              </div>
            </fieldset>
          );
        })}
        {onSort && (
          <fieldset className="space-y-2">
            <legend className="text-ink-muted mb-1 text-sm font-semibold">Sắp xếp</legend>
            <div className="flex flex-wrap gap-2">
              {visibleSorts(state.photo).map((sort) => (
                <SheetChip
                  key={sort}
                  label={SORT_LABELS[sort]}
                  selected={state.sort === sort}
                  onClick={() => onSort(sort)}
                />
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <div className="border-line flex gap-3 border-t px-4 py-3">
        <button
          type="button"
          onClick={onClear}
          disabled={countGroupFilters(state) === 0}
          className="border-line text-ink min-h-11 rounded-full border px-5 font-semibold disabled:opacity-45"
        >
          Xóa
        </button>
        <button
          type="button"
          onClick={onClose}
          data-testid="sheet-apply"
          aria-live="polite"
          className="bg-gold text-gold-fg hover:bg-gold-dark min-h-11 flex-1 rounded-full font-semibold hover:text-white"
        >
          {pending ? "Đang lọc…" : `Xem ${formatInt(facets.total)} kết quả`}
        </button>
      </div>
    </dialog>
  );
}

function SheetChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid="sheet-chip"
      className={cn(
        "focus-visible:outline-brand inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-medium focus-visible:outline-2",
        selected ? "bg-brand border-brand text-white" : "border-line text-ink bg-white",
        count === 0 && !selected && "opacity-55",
      )}
    >
      {selected && <Check className="size-4" aria-hidden />}
      {label}
      {count !== undefined && (
        <span className={cn("text-sm tabular-nums", selected ? "text-white/85" : "text-ink-muted")}>
          {formatInt(count)}
        </span>
      )}
    </button>
  );
}
