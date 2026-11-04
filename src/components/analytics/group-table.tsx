"use client";

import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useId, useState } from "react";
import { GROUP_DIM_LABELS, type GroupDim } from "@/lib/analytics-params";
import { NO_COLLECTION, PAGE_SIZE, type CatalogParams } from "@/lib/catalog-params";
import { formatInt, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsTotals, GroupRow } from "@/server/services/analytics";
import { useCatalogNav } from "../catalog/catalog-nav";
import { RateBar } from "./summary-tiles";

export type GroupSortKey = keyof AnalyticsTotals | "name";
type Dir = "asc" | "desc";

const byName = (a: GroupRow, b: GroupRow) => a.name.localeCompare(b.name, "vi");

/**
 * Sắp các dòng theo một cột (không đổi mảng gốc). Giá trị null (tỷ lệ "—") luôn xếp cuối
 * ở cả hai chiều; hòa thì theo tên A→Z kiểu tiếng Việt.
 */
export function sortGroupRows(rows: GroupRow[], key: GroupSortKey, dir: Dir): GroupRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "name") return sign * byName(a, b);
    const va = a[key];
    const vb = b[key];
    if (va === null || vb === null) {
      if (va === vb) return byName(a, b);
      return va === null ? 1 : -1;
    }
    return va !== vb ? sign * (va - vb) : byName(a, b);
  });
}

interface Column {
  key: Exclude<GroupSortKey, "name" | "shortage">;
  label: string;
  /** Cột tỷ lệ: kèm thanh nhỏ; điện thoại chỉ còn các cột này cạnh Tên. */
  rate?: "navy" | "brand";
}

const COLUMNS: Column[] = [
  { key: "products", label: "Số mã" },
  { key: "ordered", label: "Đặt" },
  { key: "received", label: "Về" },
  { key: "receivedRate", label: "% về", rate: "navy" },
  { key: "sold", label: "Bán" },
  { key: "stock", label: "Tồn" },
  { key: "sellRate", label: "% bán", rate: "brand" },
];

/** Số cột còn thấy trên điện thoại: Tên, % về, % bán, nút mở rộng. */
const MOBILE_COLS = 4;

/** Bộ lọc sau khi bấm tên nhóm: thêm giá trị đó vào bộ lọc của chiều (đi sâu vào nhóm). */
function drillState(state: CatalogParams, dim: GroupDim, id: string): CatalogParams {
  const base = { ...state, sp: null, n: PAGE_SIZE };
  if (dim === "store") return { ...base, store: id, all: false };
  const list = state[dim];
  return { ...base, [dim]: list.includes(id) ? list : [...list, id] };
}

/** Giá trị lọc của một dòng; null = dòng rỗng không có bộ lọc tương ứng (không bấm được). */
function filterValue(dim: GroupDim, id: string | null): string | null {
  if (id !== null) return id;
  return dim === "col" ? NO_COLLECTION : null;
}

/**
 * §5.3: bảng so sánh theo nhóm. Bấm tiêu đề cột để sắp (bấm lại thì đảo chiều), chỉ ở client.
 * Điện thoại (< 768px) chỉ hiện Tên, % về, % bán; bấm dòng thì mở ngay bên dưới để xem đủ số.
 */
export function GroupTable({
  rows,
  total,
  dim,
}: {
  rows: GroupRow[];
  total: AnalyticsTotals;
  dim: GroupDim;
}) {
  const [sort, setSort] = useState<{ key: GroupSortKey; dir: Dir }>({
    key: "products",
    dir: "desc",
  });
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const sorted = sortGroupRows(rows, sort.key, sort.dir);

  const onSort = (key: GroupSortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "name" ? "asc" : "desc" },
    );
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const header = (key: GroupSortKey, label: string, className: string) => {
    const active = sort.key === key;
    const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        key={key}
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
        className={cn("bg-gold-soft text-ink-muted px-2 py-2 text-xs font-semibold", className)}
      >
        <button
          type="button"
          onClick={() => onSort(key)}
          data-testid="group-sort"
          data-key={key}
          className={cn(
            "focus-visible:outline-brand inline-flex min-h-8 items-center gap-1 rounded whitespace-nowrap focus-visible:outline-2",
            active && "text-navy",
            key !== "name" && "flex-row-reverse",
          )}
        >
          {label}
          <Icon className={cn("size-3.5", !active && "invisible")} aria-hidden />
        </button>
      </th>
    );
  };

  return (
    <div className="border-line overflow-x-auto rounded-xl border bg-white">
      <table data-testid="group-table" data-dim={dim} className="w-full border-collapse">
        <caption className="sr-only">So sánh theo {GROUP_DIM_LABELS[dim].toLowerCase()}</caption>
        <thead>
          <tr>
            {header("name", GROUP_DIM_LABELS[dim], "text-left pl-3 md:pl-4")}
            {COLUMNS.map((c) =>
              header(c.key, c.label, cn("text-right", !c.rate && "hidden md:table-cell")),
            )}
            <th scope="col" className="bg-gold-soft w-10 md:hidden">
              <span className="sr-only">Xem đủ số</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const key = r.id ?? "__empty";
            const value = filterValue(dim, r.id);
            return (
              <Row
                key={key}
                row={r}
                label={r.name}
                rowId={r.id ?? ""}
                open={open.has(key)}
                onToggle={() => toggle(key)}
                name={
                  <GroupName
                    name={r.name}
                    brandName={dim === "line" || dim === "col" ? r.brandName : null}
                    dim={dim}
                    value={value}
                  />
                }
              />
            );
          })}
        </tbody>
        <tfoot>
          <Row
            total
            row={total}
            label="Tổng"
            open={open.has("__total")}
            onToggle={() => toggle("__total")}
            name="Tổng"
          />
        </tfoot>
      </table>
    </div>
  );
}

function GroupName({
  name,
  brandName,
  dim,
  value,
}: {
  name: string;
  brandName: string | null;
  dim: GroupDim;
  value: string | null;
}) {
  const { state, hrefFor } = useCatalogNav();
  const brand = brandName && (
    // Điện thoại: tên nhãn xuống dòng riêng; màn rộng: cùng dòng sau dấu "·".
    <span className="text-ink-muted block text-xs font-normal md:inline">
      <span className="hidden md:inline"> · </span>
      {brandName}
    </span>
  );
  if (value === null) {
    return (
      <span className="text-ink-muted italic">
        {name}
        {brand}
      </span>
    );
  }
  return (
    <Link
      href={hrefFor(drillState(state, dim, value))}
      scroll={false}
      prefetch={false}
      data-testid="group-link"
      className="text-navy focus-visible:outline-brand rounded font-semibold underline-offset-2 hover:underline focus-visible:outline-2"
    >
      {name}
      {brand}
    </Link>
  );
}

function Row({
  row,
  label,
  rowId,
  name,
  open,
  onToggle,
  total = false,
}: {
  row: AnalyticsTotals;
  /** Tên dòng dạng chữ (nhãn cho thanh tỷ lệ, nút mở rộng). */
  label: string;
  rowId?: string;
  name: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  total?: boolean;
}) {
  const detailId = useId();
  const Cell = total ? "th" : "td";
  const cell = cn(
    "px-2 py-2.5 tabular-nums",
    total ? "border-ink border-t-2" : "border-line border-t",
  );
  return (
    <Fragment>
      <tr
        data-testid={total ? "group-total" : "group-row"}
        data-name={total ? undefined : label}
        data-id={rowId}
        onClick={(e) => {
          // Liên kết trong dòng tự xử lý; bấm chỗ khác trên dòng thì mở/đóng (điện thoại).
          if ((e.target as HTMLElement).closest("a, button")) return;
          if (window.matchMedia("(min-width: 768px)").matches) return;
          onToggle();
        }}
        className={cn("cursor-pointer md:cursor-auto", total && "font-bold", open && "bg-cream")}
      >
        <Cell scope={total ? "row" : undefined} className={cn(cell, "pl-3 text-left md:pl-4")}>
          {name}
        </Cell>
        {COLUMNS.map((c) => (
          <td
            key={c.key}
            className={cn(cell, "text-right whitespace-nowrap", !c.rate && "hidden md:table-cell")}
          >
            {c.rate ? (
              <span className="inline-flex w-14 flex-col items-end gap-1 md:w-20">
                <span>{formatPercent(row[c.key])}</span>
                <RateBar
                  rate={row[c.key]}
                  label={`${c.label} ${label}`}
                  tone={c.rate}
                  className="h-1.5 w-full"
                />
              </span>
            ) : (
              formatInt(row[c.key])
            )}
          </td>
        ))}
        <td className={cn(cell, "w-10 pr-2 text-right md:hidden")}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`Xem đủ số: ${label}`}
            data-testid="group-expand"
            onClick={onToggle}
            className="focus-visible:outline-brand text-ink-muted grid size-9 place-items-center rounded-full focus-visible:outline-2"
          >
            <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
          </button>
        </td>
      </tr>
      <tr id={detailId} data-testid="group-detail" hidden={!open} className="bg-cream md:hidden">
        <td colSpan={MOBILE_COLS} className="px-3 pb-3">
          <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm font-normal">
            {COLUMNS.filter((c) => !c.rate).map((c) => (
              <div key={c.key}>
                <dt className="text-ink-muted text-xs">{c.label}</dt>
                <dd className="font-semibold tabular-nums">{formatInt(row[c.key])}</dd>
              </div>
            ))}
          </dl>
        </td>
      </tr>
    </Fragment>
  );
}
