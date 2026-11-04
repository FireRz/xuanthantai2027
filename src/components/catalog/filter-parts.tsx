"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CatalogParams } from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FacetCounts, FacetOption } from "@/server/services/catalog-facets";

export type GroupKey = "brand" | "line" | "col" | "mat" | "pr";
/** Điện thoại gom cả Chủng loại vào bảng lọc; máy tính có hàng chip riêng. */
export type SheetKey = GroupKey | "typ";

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "brand", label: "Nhãn hàng" },
  { key: "line", label: "Dòng hàng" },
  { key: "col", label: "Bộ sưu tập" },
  { key: "mat", label: "Tuổi vàng" },
  { key: "pr", label: "Khung giá" },
];

/** Thứ tự trong bảng lọc điện thoại: Chủng loại (hay dùng nhất) đứng đầu. */
export const SHEET_GROUPS: { key: SheetKey; label: string }[] = [
  { key: "typ", label: "Chủng loại" },
  ...GROUPS,
];

/** "Xóa lọc": bỏ mọi điều kiện lẫn mã tìm và cửa hàng (giữ sắp xếp, kiểu xem). */
export const CLEAR_ALL: Partial<CatalogParams> = {
  brand: [],
  line: [],
  col: [],
  mat: [],
  typ: [],
  pr: [],
  q: "",
  store: null,
  all: false,
};

/** Mọi lựa chọn đều hiện (cửa hàng có thể chưa đặt nhưng vẫn cần biết có SP); số đếm 0 thì làm mờ. */
export function shown(options: FacetOption[]) {
  return options;
}

/** Thêm tên nhãn cạnh dòng/BST khi các lựa chọn thuộc nhiều nhãn (tránh trùng tên "Nhẫn"). */
export function labelOf(o: FacetOption, options: FacetOption[]) {
  const many = new Set(options.map((x) => x.brandId).filter(Boolean)).size > 1;
  return many && o.brandName ? `${o.name} · ${o.brandName}` : o.name;
}

export interface SelectedChip {
  /** `q`: mã đang tìm (ô "Tìm mã SP" trên thanh cửa hàng). */
  key: SheetKey | "q";
  id: string;
  group: string;
  name: string;
  /** Chữ hiện trên chip nếu khác `name`. */
  text?: string;
}

/** Các lựa chọn đang bật, Chủng loại đứng đầu, theo thứ tự nhóm; mã đang tìm đứng cuối. */
export function selectedChips(facets: FacetCounts, state: CatalogParams): SelectedChip[] {
  const chips: SelectedChip[] = SHEET_GROUPS.flatMap(({ key, label }) =>
    state[key].map((id) => {
      const o = facets[key].find((x) => x.id === id);
      return { key, id, group: label, name: o ? labelOf(o, facets[key]) : id };
    }),
  );
  if (state.q)
    chips.push({ key: "q", id: state.q, group: "Mã SP", name: state.q, text: `Mã: ${state.q}` });
  return chips;
}

/** Bỏ một chip: mã tìm thì xóa ô tìm, còn lại bỏ lựa chọn khỏi nhóm. */
export function removeChip(c: SelectedChip, state: CatalogParams): Partial<CatalogParams> {
  return c.key === "q" ? { q: "" } : { [c.key]: state[c.key].filter((x) => x !== c.id) };
}

/** Chip lựa chọn đang bật (bấm để bỏ) + nút "Xóa lọc". */
export function ActiveFilters({
  chips,
  showClear,
  onRemove,
  onClear,
  label,
  className,
  testId,
  clearTestId,
}: {
  chips: (SelectedChip & { className?: string })[];
  showClear: boolean;
  onRemove: (c: SelectedChip) => void;
  onClear: () => void;
  /** Nhãn đứng đầu dải, ví dụ "Đang lọc:". */
  label?: string;
  className?: string;
  testId?: string;
  clearTestId?: string;
}) {
  if (chips.length === 0 && !showClear) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} data-testid={testId}>
      {label && <span className="text-ink-muted shrink-0 text-sm">{label}</span>}
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.id}`}
          type="button"
          onClick={() => onRemove(c)}
          aria-label={`Bỏ lọc ${c.group}: ${c.name}`}
          className={cn(
            "bg-gold-soft border-gold text-ink focus-visible:outline-brand inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-sm whitespace-nowrap focus-visible:outline-2",
            c.className,
          )}
        >
          {c.text ?? c.name}
          <X className="size-3.5" aria-hidden />
        </button>
      ))}
      {showClear && (
        <button
          type="button"
          data-testid={clearTestId}
          onClick={onClear}
          className="text-brand focus-visible:outline-brand min-h-8 shrink-0 rounded-full px-2 text-sm font-semibold whitespace-nowrap underline-offset-2 hover:underline focus-visible:outline-2"
        >
          Xóa lọc
        </button>
      )}
    </div>
  );
}

/** Danh sách ô tích có số đếm; nhóm > 8 lựa chọn có ô tìm (UI-DESIGN §5.1). */
export function CheckList({
  label,
  options,
  selected,
  onToggle,
  scroll = true,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Tự cuộn khi dài; tắt khi đã nằm trong vùng cuộn khác (cột lọc bên trái). */
  scroll?: boolean;
}) {
  const [term, setTerm] = useState("");
  const list = shown(options);
  const q = term.trim().toLowerCase();
  const visible = q ? list.filter((o) => labelOf(o, options).toLowerCase().includes(q)) : list;
  return (
    <>
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
      <ul className={cn(scroll && "max-h-64 overflow-y-auto")}>
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
    </>
  );
}

/** Nút thả xuống chọn nhiều có số đếm và nút "Xem N SP". */
export function FilterDropdown({
  label,
  options,
  selected,
  total,
  onToggle,
  testId = `dropdown-${label}`,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  total: number;
  onToggle: (id: string) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={root} className="md:relative" data-testid={testId}>
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-visible:outline-brand inline-flex min-h-10 items-center gap-2 rounded-full border bg-white px-4 text-[15px] font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2",
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
          className="border-line absolute left-0 z-40 mt-2 w-80 rounded-xl border bg-white p-2 shadow-lg max-md:inset-x-0 max-md:w-auto"
        >
          <CheckList label={label} options={options} selected={selected} onToggle={onToggle} />
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
