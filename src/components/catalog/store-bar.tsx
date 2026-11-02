"use client";

import { Search, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";

export interface StoreOption {
  code: string;
  name: string;
}

/**
 * Thanh "Cửa hàng của bạn" dính dưới banner (ADR-009 U14'): ô chọn cửa hàng (chọn một) + ô tìm mã SP.
 * Đổi cửa hàng áp dụng ngay; bấm "Xem hàng" áp dụng cả mã tìm và cuộn xuống danh sách.
 */
export function StoreBar({ stores, params }: { stores: StoreOption[]; params: CatalogParams }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.q);
  const [prevQ, setPrevQ] = useState(params.q);
  if (params.q !== prevQ) {
    // URL đổi từ nơi khác (Xóa lọc, Back) → đồng bộ ô tìm.
    setPrevQ(params.q);
    setQ(params.q);
  }

  const go = (patch: Partial<CatalogParams>, hash = "") => {
    const next = { ...params, n: undefined, ...patch };
    // Đổi cửa hàng thì bỏ công tắc "xem tất cả" của cửa hàng cũ.
    if (patch.store !== undefined) next.all = false;
    startTransition(() =>
      router.push(`/${buildCatalogQuery(next)}${hash}`, { scroll: hash !== "" }),
    );
  };

  return (
    <div
      id="cua-hang"
      data-testid="store-bar"
      className="border-gold sticky top-0 z-30 scroll-mt-0 border-b-2 bg-white shadow-sm"
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: q.trim() }, "#san-pham");
        }}
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6"
      >
        <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-none">
          <Store className="text-brand size-5 shrink-0" aria-hidden />
          <span className="hidden font-semibold whitespace-nowrap lg:inline">Cửa hàng của bạn</span>
          <select
            aria-label="Cửa hàng của bạn"
            value={params.store ?? ""}
            onChange={(e) => go({ store: e.target.value || null })}
            className="border-brand bg-gold-soft text-ink focus-visible:outline-brand min-h-11 min-w-0 flex-1 rounded-lg border-2 px-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-64 sm:flex-none"
          >
            <option value="">Tất cả cửa hàng (tổng hệ thống)</option>
            {stores.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative flex min-w-0 flex-1 basis-40 items-center">
          <Search
            className="text-ink-muted pointer-events-none absolute left-3 size-4"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Tìm mã SP"
            placeholder="Tìm mã SP"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-line focus-visible:outline-brand min-h-11 w-full rounded-lg border bg-white pr-3 pl-9 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-gold text-gold-fg hover:bg-gold-dark focus-visible:outline-brand min-h-11 rounded-full px-5 font-semibold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
        >
          Xem hàng
        </button>
      </form>
    </div>
  );
}
