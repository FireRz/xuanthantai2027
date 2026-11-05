"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { formatInt } from "@/lib/format";
import type { ImportPreview } from "@/lib/import-types";
import { uploadImportFile } from "@/lib/import-upload";
import { applyImportAction, discardImportAction, previewImportAction } from "./actions";

type Tab = "all" | "new" | "changed" | "errors";

interface Row {
  kind: "error" | "new" | "changed";
  sheet: string;
  line: number;
  column: string;
  key: string;
  old?: string;
  next?: string;
  reason: string;
}

const EM = "—";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;

/** Gộp lỗi + thay đổi thành các dòng của bảng chi tiết (mỗi trường đổi một dòng: cũ → mới). */
function buildRows(p: ImportPreview): Row[] {
  const rows: Row[] = [];
  for (const i of p.issues) {
    rows.push({
      kind: "error",
      sheet: i.sheet,
      line: i.row,
      column: i.column || EM,
      key: i.key,
      reason: i.reason,
    });
  }
  for (const it of p.productItems) {
    if (it.kind === "new") {
      rows.push({
        kind: "new",
        sheet: "SanPham",
        line: it.row,
        column: EM,
        key: it.sku,
        old: EM,
        next: it.changes.map((c) => `${c.column}: ${c.new}`).join(" · "),
        reason: "SP mới",
      });
    } else {
      for (const c of it.changes) {
        rows.push({
          kind: "changed",
          sheet: "SanPham",
          line: it.row,
          column: c.column,
          key: it.sku,
          old: c.old,
          next: c.new,
          reason: "Thay đổi",
        });
      }
    }
  }
  for (const q of p.quantityItems) {
    const key = `${q.sku} / ${q.store}`;
    if (q.old.ordered !== q.new.ordered) {
      rows.push({
        kind: "changed",
        sheet: "SoLuong",
        line: q.row,
        column: "SL đặt",
        key,
        old: formatInt(q.old.ordered),
        next: formatInt(q.new.ordered),
        reason: "Thay đổi",
      });
    }
    if (q.old.received !== q.new.received) {
      rows.push({
        kind: "changed",
        sheet: "SoLuong",
        line: q.row,
        column: "SL đã về",
        key,
        old: formatInt(q.old.received),
        next: formatInt(q.new.received),
        reason: "Thay đổi",
      });
    }
    for (const [f, label] of [
      ["sold", "Bán"],
      ["stock", "Tồn"],
    ] as const) {
      if (q.old[f] !== q.new[f]) {
        rows.push({
          kind: "changed",
          sheet: "SoLuong",
          line: q.row,
          column: label,
          key,
          old: formatInt(q.old[f]),
          next: formatInt(q.new[f]),
          reason: "Thay đổi",
        });
      }
    }
  }
  return rows;
}

function Card({
  value,
  label,
  id,
  danger,
}: {
  value: number;
  label: string;
  id: string;
  danger?: boolean;
}) {
  return (
    <div
      data-testid={id}
      className={`rounded-lg border p-4 ${
        danger && value > 0
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-neutral-200 bg-white text-neutral-900"
      }`}
    >
      <b className="block text-2xl tabular-nums">{formatInt(value)}</b>
      <span className="text-sm">{label}</span>
    </div>
  );
}

type Phase =
  | { name: "idle" }
  | { name: "uploading"; file: string }
  | { name: "preview"; url: string; file: string; preview: ImportPreview }
  | { name: "done"; message: string };

export function ImportFlow() {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [applying, startApply] = useTransition();

  async function choose(file: File) {
    setError(null);
    if (!/\.xlsx$/i.test(file.name)) {
      return setError("Chỉ nhận file Excel .xlsx. Hãy lưu file theo định dạng .xlsx.");
    }
    setPhase({ name: "uploading", file: file.name });
    let url: string;
    try {
      url = await uploadImportFile(file);
    } catch {
      setPhase({ name: "idle" });
      return setError("Không tải được file lên. Kiểm tra mạng rồi thử lại.");
    }
    const res = await previewImportAction(url);
    if (!res.ok) {
      setPhase({ name: "idle" });
      void discardImportAction(url);
      return setError(res.error);
    }
    setTab(res.data!.summary.errors > 0 ? "errors" : "all");
    setPhase({ name: "preview", url, file: file.name, preview: res.data! });
  }

  function reset() {
    if (phase.name === "preview") void discardImportAction(phase.url);
    setPhase({ name: "idle" });
    setError(null);
    if (input.current) input.current.value = "";
  }

  function apply() {
    if (phase.name !== "preview") return;
    const url = phase.url;
    setError(null);
    startApply(async () => {
      const res = await applyImportAction(url);
      if (!res.ok) return setError(res.error);
      const r = res.data!;
      setPhase({
        name: "done",
        message: `Đã áp dụng: ${formatInt(r.newProducts)} SP mới, ${formatInt(r.updatedProducts)} SP thay đổi, ${formatInt(r.quantityRows)} dòng số lượng (${seconds(r.elapsedMs)}).`,
      });
    });
  }

  const picker = (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-6 text-center">
      <input
        ref={input}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Chọn file Excel"
        disabled={phase.name === "uploading"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void choose(f);
        }}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      {phase.name === "uploading" && (
        <p role="status" className="mt-3 text-sm text-neutral-600">
          Đang tải “{phase.file}” lên và kiểm tra…
        </p>
      )}
    </div>
  );

  if (phase.name === "done") {
    return (
      <div className="space-y-3">
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-800"
        >
          {phase.message}
        </p>
        <div className="flex gap-2">
          <Button onClick={reset}>Nhập file khác</Button>
          <Link
            href="/admin/products"
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
          >
            Xem sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  if (phase.name !== "preview") {
    return (
      <div className="space-y-3">
        {picker}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const { preview } = phase;
  const s = preview.summary;
  const rows = buildRows(preview);
  const shown = rows.filter((r) =>
    tab === "all"
      ? true
      : tab === "new"
        ? r.kind === "new"
        : tab === "changed"
          ? r.kind === "changed"
          : r.kind === "error",
  );
  const changedCount = s.changedProducts + s.changedQuantities;
  const nothing = s.newProducts + changedCount === 0;
  const blocked = s.errors > 0;
  const tabs: [Tab, string][] = [
    ["all", "Tất cả"],
    ["new", "SP mới"],
    ["changed", "Thay đổi"],
    ["errors", `Lỗi (${formatInt(s.errors)})`],
  ];
  const truncated =
    preview.truncated.issues || preview.truncated.productItems || preview.truncated.quantityItems;

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        File: <b>{phase.file}</b> ·{" "}
        {[preview.sheets.products && "SanPham", preview.sheets.quantities && "SoLuong"]
          .filter(Boolean)
          .join(", ") || "không có sheet hợp lệ"}{" "}
        · chưa ghi vào hệ thống
        {preview.elapsedMs !== undefined && ` · kiểm tra mất ${seconds(preview.elapsedMs)}`}
      </p>

      {blocked ? (
        <p
          role="alert"
          data-testid="import-blocked"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Còn {formatInt(s.errors)} lỗi — sửa file rồi tải lại. Nút Áp dụng bị khóa cho đến khi hết
          lỗi.
        </p>
      ) : nothing ? (
        <p role="status" className="rounded-md border bg-white px-3 py-2 text-sm">
          File không tạo thay đổi nào so với dữ liệu hiện có.
        </p>
      ) : (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          Không có lỗi. Kiểm tra các thay đổi bên dưới rồi bấm Áp dụng.
        </p>
      )}

      {preview.newCatalog && preview.newCatalog.length > 0 && (
        <details
          data-testid="import-new-catalog"
          className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900"
        >
          <summary className="cursor-pointer font-medium">
            Sẽ tự tạo {formatInt(preview.newCatalog.length)} danh mục chưa có trên web
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {preview.newCatalog.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card id="sum-new" value={s.newProducts} label="SP mới" />
        <Card id="sum-changed" value={s.changedProducts} label="SP thay đổi" />
        <Card id="sum-qty" value={s.changedQuantities} label="Dòng SL thay đổi" />
        <Card id="sum-errors" value={s.errors} label="Lỗi" danger />
      </div>
      <p className="text-xs text-neutral-500">
        Không đổi: {formatInt(s.unchangedProducts)} SP, {formatInt(s.unchangedQuantities)} dòng SL.
      </p>

      <div role="tablist" aria-label="Lọc theo loại" className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === id ? "bg-neutral-900 text-white" : "border bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-sm" data-testid="import-table">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2">Sheet</th>
              <th className="px-3 py-2">Dòng</th>
              <th className="px-3 py-2">Cột</th>
              <th className="px-3 py-2">Mã SP / CH</th>
              <th className="px-3 py-2">Cũ → Mới</th>
              <th className="px-3 py-2">Lý do</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  Không có mục nào.
                </td>
              </tr>
            )}
            {shown.map((r, i) => (
              <tr
                key={i}
                data-testid={r.kind === "error" ? "import-error-row" : "import-row"}
                className={`border-t border-neutral-100 ${r.kind === "error" ? "bg-red-50" : ""}`}
              >
                <td className="px-3 py-2">{r.sheet}</td>
                <td className="px-3 py-2 tabular-nums">{r.line > 0 ? r.line : EM}</td>
                <td className="px-3 py-2">{r.column}</td>
                <td className="px-3 py-2">{r.key}</td>
                <td className="px-3 py-2">
                  {r.old === undefined ? (
                    EM
                  ) : (
                    <>
                      <span className="text-neutral-500 line-through">{r.old}</span>
                      {" → "}
                      <b className="text-green-700">{r.next}</b>
                    </>
                  )}
                </td>
                <td className={`px-3 py-2 ${r.kind === "error" ? "text-red-800" : ""}`}>
                  {r.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-xs text-neutral-500">
          Danh sách chi tiết chỉ hiện tối đa 1.000 mục mỗi loại; các số tổng ở trên là đầy đủ.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={reset} disabled={applying}>
          Chọn file khác
        </Button>
        <Button onClick={apply} disabled={blocked || nothing || applying}>
          {applying ? "Đang áp dụng…" : blocked ? "Áp dụng (khóa)" : "Áp dụng"}
        </Button>
      </div>
    </div>
  );
}
