"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { countGroupFilters, hasActiveFilter, type CatalogParams } from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FacetCounts } from "@/server/services/catalog-facets";
import { SortMenu } from "./catalog-toolbar";
import {
  ActiveFilters,
  CheckList,
  FilterDropdown,
  SHEET_GROUPS,
  type SelectedChip,
  type SheetKey,
} from "./filter-parts";

/** Mép dưới thanh "Cửa hàng của bạn" (đang dính ở đầu trang), do StoreBar ghi ra `--store-bar-h`. */
function dockTop() {
  return (
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--store-bar-h")) || 0
  );
}

/**
 * Thanh lọc đầy đủ đã cuộn khuất dưới thanh cửa hàng (và dưới chỗ thanh gọn sẽ hiện) chưa.
 * Tính theo mép dưới nên không có vùng nào hiện cả hai bộ lọc cùng lúc.
 */
export function useDocked(
  bar: RefObject<HTMLElement | null>,
  dock: RefObject<HTMLElement | null>,
): boolean {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const el = bar.current;
      if (!el) return;
      const limit = dockTop() + (dock.current?.offsetHeight ?? 0);
      setDocked(el.getBoundingClientRect().bottom <= limit);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [bar, dock]);
  return docked;
}

/**
 * Lọc từ thanh dính/cột trái khi đang ở sâu trong danh sách → cuộn về đầu kết quả mới,
 * dừng ngay dưới thanh dính để bộ lọc vẫn hiện, lọc tiếp được.
 */
export function scrollToResults(dock: RefObject<HTMLElement | null>) {
  const el = document.getElementById("ket-qua");
  if (!el) return;
  const top =
    el.getBoundingClientRect().top +
    window.scrollY -
    dockTop() -
    (dock.current?.offsetHeight ?? 0) -
    12;
  if (top >= window.scrollY) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

/** Nhóm chưa có lựa chọn nào (ví dụ chưa nhập Chủng loại) thì không chiếm chỗ ở thanh dính/cột trái. */
function nonEmptyGroups(facets: FacetCounts) {
  return SHEET_GROUPS.filter(({ key }) => facets[key].length > 0);
}

interface DockProps {
  docked: boolean;
  facets: FacetCounts;
  state: CatalogParams;
  pending: boolean;
  chips: SelectedChip[];
  onToggle: (key: SheetKey, id: string) => void;
  onRemove: (c: SelectedChip) => void;
  onClear: () => void;
  /** Có menu sắp xếp (trang phân tích tắt đi). */
  showSort: boolean;
}

/**
 * Bộ lọc khi đã cuộn qua thanh lọc đầy đủ: màn ≥ 1800px là cột bên trái (lề trống),
 * màn hẹp hơn là thanh gọn dính dưới thanh cửa hàng. Kéo lên thấy thanh đầy đủ thì cả hai ẩn.
 */
export function FilterDock({
  dockRef,
  onOpenSheet,
  extra,
  ...props
}: DockProps & {
  dockRef: RefObject<HTMLDivElement | null>;
  /** Điện thoại: mở bảng lọc trượt từ dưới lên. */
  onOpenSheet: () => void;
  /** Mục thêm trong cột trái (công tắc "Xem tất cả SP"). */
  extra?: React.ReactNode;
}) {
  const { docked, facets, state, pending, chips, onToggle, onRemove, onClear, showSort } = props;
  const hidden = !docked;
  const groupCount = countGroupFilters(state);
  // Gắn thẳng vào <body>: thanh lọc gốc mờ đi khi đang tải (opacity tạo lớp xếp chồng riêng)
  // sẽ kéo thanh dính xuống dưới lưới sản phẩm.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <>
      <div
        ref={dockRef}
        data-testid="filter-dock"
        inert={hidden}
        aria-hidden={hidden || undefined}
        className={cn(
          "border-line fixed inset-x-0 top-(--store-bar-h) z-20 border-b bg-white shadow-sm transition duration-200 motion-reduce:transition-none min-[1800px]:hidden",
          hidden && "invisible -translate-y-2 opacity-0",
        )}
      >
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSheet}
              aria-haspopup="dialog"
              className="press border-brand text-brand focus-visible:outline-brand inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 bg-white px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Lọc{groupCount > 0 && ` (${groupCount})`}
            </button>
            <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">
              {nonEmptyGroups(facets).map(({ key, label }) => (
                <FilterDropdown
                  key={key}
                  testId={`dock-dropdown-${label}`}
                  label={label}
                  options={facets[key]}
                  selected={state[key]}
                  total={facets.total}
                  onToggle={(id) => onToggle(key, id)}
                />
              ))}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <span className="text-ink-muted hidden text-sm whitespace-nowrap lg:inline">
                {pending ? "Đang lọc…" : `${formatInt(facets.total)} SP`}
              </span>
              {showSort && <SortMenu testId="dock-sort-menu" />}
            </div>
          </div>
          <ActiveFilters
            chips={chips}
            showClear={hasActiveFilter(state)}
            onRemove={onRemove}
            onClear={onClear}
            label="Đang lọc:"
            className="flex-nowrap overflow-x-auto md:flex-wrap"
            testId="dock-active-filters"
          />
        </div>
      </div>
      <FilterSidebar {...props} extra={extra} />
    </>,
    document.body,
  );
}

/** Cột lọc trong lề trống bên trái: đầu cột có số kết quả, "Đang lọc", các nhóm mở/đóng, sắp xếp. */
function FilterSidebar({
  docked,
  facets,
  state,
  pending,
  chips,
  onToggle,
  onRemove,
  onClear,
  showSort,
  extra,
}: DockProps & { extra?: React.ReactNode }) {
  const groups = nonEmptyGroups(facets);
  // Mỗi lần mở một nhóm để cột không quá dài; nhóm đầu (Chủng loại, hay dùng nhất) mở sẵn.
  const [open, setOpen] = useState<SheetKey | null>(groups[0]?.key ?? null);
  const baseId = useId();
  const hidden = !docked;
  return (
    <aside
      aria-label="Bộ lọc"
      data-testid="filter-sidebar"
      inert={hidden}
      aria-hidden={hidden || undefined}
      className={cn(
        "border-line fixed top-[calc(var(--store-bar-h)+1rem)] left-[calc((100vw-80rem)/2-15rem)] z-20 hidden max-h-[calc(100dvh-var(--store-bar-h)-2rem)] w-60 flex-col rounded-xl border bg-white shadow-md transition duration-200 motion-reduce:transition-none min-[1800px]:flex",
        hidden && "invisible -translate-x-3 opacity-0",
      )}
    >
      <div className="border-line flex items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="font-display text-navy text-lg leading-tight font-semibold">Bộ lọc</h2>
          <p className="text-ink-muted text-sm">
            {pending ? "Đang lọc…" : `Đang xem ${formatInt(facets.total)} SP`}
          </p>
        </div>
        {hasActiveFilter(state) && (
          <button
            type="button"
            onClick={onClear}
            className="press text-brand focus-visible:outline-brand min-h-8 shrink-0 rounded-full px-2 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-2"
          >
            Xóa lọc
          </button>
        )}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {extra}
        <section aria-label="Đang lọc">
          <p className="text-ink-muted mb-2 text-sm font-semibold">Đang lọc</p>
          {chips.length > 0 ? (
            <ActiveFilters chips={chips} showClear={false} onRemove={onRemove} onClear={onClear} />
          ) : (
            <p className="text-ink-muted text-sm">Chưa chọn bộ lọc nào, đang xem tất cả.</p>
          )}
        </section>
        <div className="divide-line border-line divide-y border-y">
          {groups.map(({ key, label }) => {
            const n = state[key].length;
            const isOpen = open === key;
            const panelId = `${baseId}-${key}`;
            return (
              <div key={key}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="focus-visible:outline-brand flex min-h-11 w-full items-center gap-2 text-left font-semibold focus-visible:outline-2"
                >
                  <span className="flex-1">{label}</span>
                  {n > 0 && (
                    <span className="bg-brand rounded-full px-2 text-xs leading-5 text-white">
                      {n}
                    </span>
                  )}
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
                {isOpen && (
                  <div id={panelId} role="group" aria-label={label} className="-mx-3 pb-2">
                    <CheckList
                      label={label}
                      options={facets[key]}
                      selected={state[key]}
                      onToggle={(id) => onToggle(key, id)}
                      scroll={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {showSort && (
          <div>
            <p className="text-ink-muted mb-2 text-sm font-semibold">Sắp xếp</p>
            <SortMenu testId="sidebar-sort-menu" compact />
          </div>
        )}
      </div>
    </aside>
  );
}
