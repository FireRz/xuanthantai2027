"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import { setActiveAction } from "./actions";

export interface ProductRow {
  id: string;
  sku: string;
  name: string | null;
  priceVnd: number | null;
  thumbUrl: string | null;
  active: boolean;
  brand: string;
  line: string;
  collection: string | null;
  material: string | null;
}

/** Bảng SP có chọn nhiều dòng để ẩn / hiện cùng lúc (không có nút xóa — ADR-008 P2). */
export function ProductTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  function apply(ids: string[], active: boolean) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await setActiveAction(ids, active);
      if (!r.ok) return setError(r.error);
      setNotice(`Đã ${active ? "hiện" : "ẩn"} ${r.data!.count} sản phẩm.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div
        role="toolbar"
        aria-label="Thao tác với sản phẩm đã chọn"
        className="flex min-h-14 flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm"
      >
        <span className="font-medium">
          {selected.size > 0 ? `Đã chọn ${selected.size}` : "Chọn sản phẩm để ẩn / hiện hàng loạt"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || selected.size === 0}
          onClick={() => apply([...selected], false)}
        >
          Ẩn đã chọn
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || selected.size === 0}
          onClick={() => apply([...selected], true)}
        >
          Hiện đã chọn
        </Button>
        {selected.size > 0 && (
          <button
            type="button"
            className="text-neutral-600 underline"
            onClick={() => setSelected(new Set())}
          >
            Bỏ chọn
          </button>
        )}
        {error && (
          <span role="alert" className="text-red-800">
            {error}
          </span>
        )}
        {notice && (
          <span role="status" className="text-green-800">
            {notice}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả sản phẩm trong trang"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
                  }
                />
              </th>
              <th className="p-3">Ảnh</th>
              <th className="p-3">Mã</th>
              <th className="p-3">Tên</th>
              <th className="p-3">Nhãn</th>
              <th className="p-3">Dòng</th>
              <th className="p-3">BST</th>
              <th className="p-3">Tuổi vàng</th>
              <th className="p-3 text-right">Giá</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-neutral-500">
                  Không có sản phẩm nào khớp.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                data-testid="product-row"
                data-sku={r.sku}
                className="border-b border-neutral-100"
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${r.sku}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </td>
                <td className="p-2">
                  <ProductImage
                    thumbUrl={r.thumbUrl}
                    alt={r.sku}
                    className="h-12 w-12 rounded text-xs"
                  />
                </td>
                <td className="p-3 font-medium">
                  <Link href={`/admin/products/${r.id}`} className="hover:underline">
                    {r.sku}
                  </Link>
                </td>
                <td className="p-3">{r.name ?? "—"}</td>
                <td className="p-3">{r.brand}</td>
                <td className="p-3">{r.line}</td>
                <td className="p-3">{r.collection ?? "—"}</td>
                <td className="p-3">{r.material ?? "—"}</td>
                <td className="p-3 text-right">
                  {r.priceVnd == null ? "—" : formatVnd(r.priceVnd)}
                </td>
                <td className="p-3">
                  <span
                    className={
                      r.active
                        ? "rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800"
                        : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700"
                    }
                  >
                    {r.active ? "Đang hiện" : "Đã ẩn"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => apply([r.id], !r.active)}
                    aria-label={`${r.active ? "Ẩn" : "Hiện"} ${r.sku}`}
                  >
                    {r.active ? "Ẩn" : "Hiện"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
