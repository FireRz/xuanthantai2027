"use client";

import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { countGroupFilters, hasActiveFilter, type CatalogParams } from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FacetCounts, FacetOption } from "@/server/services/catalog-facets";
import { toggleId, useCatalogNav } from "./catalog-nav";

type GroupKey = "brand" | "line" | "col" | "mat";

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "brand", label: "Nhãn hàng" },
  { key: "line", label: "Dòng hàng" },
  { key: "col", label: "Bộ sưu tập" },
  { key: "mat", label: "Chất liệu" },
];

/** Mọi lựa chọn đều hiện (cửa hàng có thể chưa đặt nhưng vẫn cần biết có SP); số đếm 0 thì làm mờ. */
function shown(options: FacetOption[]) {
  return options;
}

/** Thêm tên nhãn cạnh dòng/BST khi các lựa chọn thuộc nhiều nhãn (tránh trùng tên "Nhẫn"). */
function labelOf(o: FacetOption, options: FacetOption[]) {
  const many = new Set(options.map((x) => x.brandId).filter(Boolean)).size > 1;
  return many && o.brandName ? `${o.name} · ${o.brandName}` : o.name;
}

/**
 * Bộ lọc (ADR-009 U8'): hàng chip Nhãn hàng; nút thả xuống Dòng / BST / Chất liệu (chọn nhiều,
 * số đếm, nút "Xem N SP"); điện thoại: bảng lọc trượt từ dưới lên với các chip.
 * Chọn tới đâu áp dụng tới đó lên URL (B9); số đếm là của máy chủ (B4).
 */
export function FilterBar({
  facets,
  toolbar,
}: {
  facets: FacetCounts;
  /** Sắp xếp + công tắc "Xem tất cả SP" (T04.7, T04.8). */
  toolbar?: React.ReactNode;
}) {
  const owned = (xs: FacetOption[]) =>
    xs.filter((o) => o.brandId).map((o) => ({ id: o.id, brandId: o.brandId as string }));
  const { state, go: navigate, pending } = useCatalogNav();
  const go = (patch: Partial<CatalogParams>) =>
    navigate(patch, { owned: { lines: owned(facets.line), cols: owned(facets.col) } });
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggle = (key: GroupKey, id: string) => go({ [key]: toggleId(state[key], id) });
  const groupCount = countGroupFilters(state);
  const options = (key: GroupKey) => facets[key];

  const selectedChips = GROUPS.flatMap(({ key, label }) =>
    state[key].map((id) => {
      const o = options(key).find((x) => x.id === id);
      return { key, id, group: label, name: o ? labelOf(o, options(key)) : id };
    }),
  );

  return (
    <div
      data-testid="filter-bar"
      aria-busy={pending}
      className={cn("space-y-3", pending && "opacity-90")}
    >
      {/* Máy tính / tablet: hàng chip Nhãn hàng */}
      <div
        className="hidden flex-wrap items-center gap-2 md:flex"
        role="group"
        aria-label="Nhãn hàng"
      >
        <span className="text-ink-muted mr-1 text-sm font-semibold">Nhãn hàng</span>
        {facets.brand.map((o) => (
          <Chip
            key={o.id}
            option={o}
            selected={state.brand.includes(o.id)}
            onClick={() => toggle("brand", o.id)}
          />
        ))}
      </div>

      {/* Một hàng cho cả hai cỡ màn hình: nút thả xuống (máy tính) hoặc nút Lọc (điện thoại) + sắp xếp, công tắc */}
      <div className="flex flex-wrap items-center gap-2">
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
        {GROUPS.slice(1).map(({ key, label }) => (
          <div key={key} className="hidden md:block">
            <FilterDropdown
              label={label}
              options={options(key)}
              selected={state[key]}
              total={facets.total}
              onToggle={(id) => toggle(key, id)}
            />
          </div>
        ))}
        {toolbar && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {toolbar}
          </div>
        )}
      </div>

      {(selectedChips.length > 0 || hasActiveFilter(state)) && (
        <div className="flex flex-wrap items-center gap-2" data-testid="active-filters">
          {selectedChips.map((c) => (
            <button
              key={`${c.key}-${c.id}`}
              type="button"
              onClick={() => toggle(c.key, c.id)}
              aria-label={`Bỏ lọc ${c.group}: ${c.name}`}
              className="bg-gold-soft border-gold text-ink focus-visible:outline-brand inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-sm focus-visible:outline-2"
            >
              {c.name}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
          {hasActiveFilter(state) && (
            <button
              type="button"
              data-testid="clear-filters"
              onClick={() =>
                go({ brand: [], line: [], col: [], mat: [], q: "", store: null, all: false })
              }
              className="text-brand focus-visible:outline-brand min-h-8 rounded-full px-2 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline-2"
            >
              Xóa lọc
            </button>
          )}
        </div>
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        facets={facets}
        state={state}
        pending={pending}
        onToggle={toggle}
        onClear={() => go({ brand: [], line: [], col: [], mat: [] })}
      />
    </div>
  );
}

function Chip({
  option,
  selected,
  onClick,
}: {
  option: FacetOption;
  selected: boolean;
  onClick: () => void;
}) {
  // 0 SP với các bộ lọc khác: làm mờ nhưng vẫn bấm được (nếu không, đã chọn dòng thì không đổi được nhãn).
  const empty = option.count === 0 && !selected;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid="filter-chip"
      className={cn(
        "focus-visible:outline-brand inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2",
        selected
          ? "bg-brand border-brand text-white"
          : "border-line text-ink hover:border-gold bg-white",
        empty && "opacity-55",
      )}
    >
      {selected && <Check className="size-4" aria-hidden />}
      {option.name}
      <span className={cn("text-sm tabular-nums", selected ? "text-white/85" : "text-ink-muted")}>
        {formatInt(option.count)}
      </span>
    </button>
  );
}

/** Nút thả xuống chọn nhiều có số đếm; nhóm > 8 lựa chọn có ô tìm (UI-DESIGN §5.1). */
function FilterDropdown({
  label,
  options,
  selected,
  total,
  onToggle,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  total: number;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = shown(options);
  const q = term.trim().toLowerCase();
  const visible = q ? list.filter((o) => labelOf(o, options).toLowerCase().includes(q)) : list;

  return (
    <div ref={root} className="relative" data-testid={`dropdown-${label}`}>
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-visible:outline-brand inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-4 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2",
          selected.length > 0 ? "border-brand text-brand border-2" : "border-line text-ink",
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-brand rounded-full px-2 text-xs leading-5 text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="border-line absolute left-0 z-40 mt-2 w-80 rounded-xl border bg-white p-2 shadow-lg"
        >
          {list.length > 8 && (
            <input
              type="search"
              aria-label={`Tìm trong ${label}`}
              placeholder="Tìm…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="border-line focus-visible:outline-brand mb-2 min-h-10 w-full rounded-lg border px-3 focus-visible:outline-2"
            />
          )}
          <ul className="max-h-64 overflow-y-auto">
            {visible.length === 0 && (
              <li className="text-ink-muted px-3 py-2 text-sm">Không có lựa chọn phù hợp</li>
            )}
            {visible.map((o) => (
              <li key={o.id}>
                <label
                  className={cn(
                    "hover:bg-gold-soft flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3",
                    o.count === 0 && !selected.includes(o.id) && "opacity-55",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={() => onToggle(o.id)}
                    className="accent-brand size-4"
                  />
                  <span className="min-w-0 flex-1 leading-snug">{labelOf(o, options)}</span>
                  <span className="text-ink-muted text-sm tabular-nums">{formatInt(o.count)}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-gold text-gold-fg hover:bg-gold-dark mt-2 min-h-10 w-full rounded-full font-semibold hover:text-white"
          >
            Xem {formatInt(total)} SP
          </button>
        </div>
      )}
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
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  facets: FacetCounts;
  state: CatalogParams;
  pending: boolean;
  onToggle: (key: GroupKey, id: string) => void;
  onClear: () => void;
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
        {GROUPS.map(({ key, label }) => {
          const all = facets[key];
          const list = key === "brand" ? all : shown(all);
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
  count: number;
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
      <span className={cn("text-sm tabular-nums", selected ? "text-white/85" : "text-ink-muted")}>
        {formatInt(count)}
      </span>
    </button>
  );
}
