"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveQuantitiesAction } from "./actions";

export interface EditorRow {
  /** Khóa dòng (id cửa hàng hoặc id SP, tùy chế độ xem). */
  key: string;
  productId: string;
  storeId: string;
  label: string;
  sub?: string;
  muted?: boolean;
  ordered: number;
  received: number;
}

type Field = "ordered" | "received";
type Draft = Record<Field, string>;

const invalid = (v: string) => !/^\d{1,10}$/.test(v.trim());

/** Bảng sửa SL inline; chỉ gửi các ô đã đổi, lưu cả lô trong một transaction. */
export function QuantityEditor({ rows, rowHeader }: { rows: EditorRow[]; rowHeader: string }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const val = (r: EditorRow, f: Field) => drafts[r.key]?.[f] ?? String(r[f]);
  const set = (r: EditorRow, f: Field, v: string) => {
    setNotice(null);
    setDrafts((d) => ({
      ...d,
      [r.key]: { ordered: val(r, "ordered"), received: val(r, "received"), [f]: v },
    }));
  };

  const changed = rows.flatMap((r) => {
    const d = drafts[r.key];
    if (!d) return [];
    const ordered = d.ordered.trim() === String(r.ordered) ? undefined : d.ordered;
    const received = d.received.trim() === String(r.received) ? undefined : d.received;
    return ordered === undefined && received === undefined ? [] : [{ r, ordered, received }];
  });
  const hasInvalid = changed.some(
    (c) =>
      (c.ordered !== undefined && invalid(c.ordered)) ||
      (c.received !== undefined && invalid(c.received)),
  );

  function save() {
    setError(null);
    start(async () => {
      const res = await saveQuantitiesAction(
        changed.map((c) => ({
          productId: c.r.productId,
          storeId: c.r.storeId,
          ordered: c.ordered === undefined ? undefined : Number(c.ordered),
          received: c.received === undefined ? undefined : Number(c.received),
        })),
      );
      if (!res.ok) return setError(res.error);
      setNotice(`Đã lưu ${res.data!.count} dòng.`);
      setDrafts({});
      router.refresh();
    });
  }

  const input = (r: EditorRow, f: Field, label: string) => {
    const v = val(r, f);
    return (
      <input
        aria-label={`${label} — ${r.label}`}
        inputMode="numeric"
        value={v}
        onChange={(e) => set(r, f, e.target.value)}
        aria-invalid={invalid(v)}
        className="h-9 w-24 rounded-md border border-neutral-300 px-2 text-right text-sm aria-invalid:border-red-500"
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-3 py-2">{rowHeader}</th>
              <th className="px-3 py-2 text-right">SL đặt</th>
              <th className="px-3 py-2 text-right">SL đã về</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                data-testid="qty-row"
                className={`border-t border-neutral-100 ${r.muted ? "text-neutral-400" : ""}`}
              >
                <td className="px-3 py-2">
                  <span className="font-medium">{r.label}</span>
                  {r.sub && <span className="ml-2 text-neutral-500">{r.sub}</span>}
                </td>
                <td className="px-3 py-2 text-right">{input(r, "ordered", "SL đặt")}</td>
                <td className="px-3 py-2 text-right">{input(r, "received", "SL đã về")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {notice}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || changed.length === 0 || hasInvalid}>
          {pending ? "Đang lưu…" : `Lưu thay đổi${changed.length ? ` (${changed.length})` : ""}`}
        </Button>
        {hasInvalid && (
          <span className="text-sm text-red-700">Số lượng phải là số nguyên ≥ 0.</span>
        )}
      </div>
    </div>
  );
}
