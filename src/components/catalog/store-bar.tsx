"use client";

import { Search, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CatalogParams } from "@/lib/catalog-params";
import { regionLabel, sameRegion, sortRegions } from "@/lib/region";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";
import { CoachHint } from "./coach-hints";
import { PhotoSwitch } from "./photo-switch";

/** Thời gian chờ sau phím cuối trước khi lọc theo mã (ms). */
export const SEARCH_DEBOUNCE_MS = 350;

export interface StoreOption {
  code: string;
  name: string;
  /** Khu vực (ASM); null = chưa gán. */
  region?: string | null;
}

/**
 * Thanh "Cửa hàng của bạn" dính dưới banner (ADR-009 U14'): ô chọn khu vực (khi đã có khu vực),
 * ô chọn cửa hàng (chọn một; đã chọn khu vực thì chỉ còn cửa hàng của khu vực đó) + ô tìm mã SP.
 * Đổi cửa hàng áp dụng ngay; bấm "Tìm" áp dụng cả mã tìm và cuộn xuống danh sách.
 * Cuối hàng là công tắc "Chỉ xem hình" — thanh dính khi cuộn nên công tắc luôn trong tầm mắt.
 */
export function StoreBar({
  stores,
  showPhotoSwitch = true,
}: {
  stores: StoreOption[];
  /** Công tắc "Chỉ xem hình" — trang phân tích không có (chỉ có số). */
  showPhotoSwitch?: boolean;
}) {
  const { state: params, go: navigate, pending } = useCatalogNav();
  const [q, setQ] = useState(params.q);
  const [prevQ, setPrevQ] = useState(params.q);
  if (params.q !== prevQ) {
    // URL đổi từ nơi khác (Xóa lọc, Back) → đồng bộ ô tìm.
    setPrevQ(params.q);
    setQ(params.q);
  }

  // Gõ tới đâu tìm tới đó: chờ SEARCH_DEBOUNCE_MS sau phím cuối rồi mới lọc (T04.6).
  useEffect(() => {
    const next = q.trim();
    if (next === params.q) return;
    const t = setTimeout(() => go({ q: next }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, params.q]);

  // Điện thoại (thanh xuống 2 dòng): khi đã dính thì lùi lên đúng bằng hàng chọn cửa hàng, chỉ còn
  // hàng tìm mã — dùng `top` âm của sticky nên không đổi chiều cao trong trang (danh sách không giật).
  // Phần còn thấy được ghi ra `--store-bar-h`, để bộ lọc dính ngay bên dưới.
  const bar = useRef<HTMLDivElement>(null);
  const searchRow = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    const el = bar.current;
    const row = searchRow.current;
    if (!el || !row) return;
    const root = document.documentElement;
    const update = () => {
      const form = getComputedStyle(row.parentElement as Element);
      const padTop = parseFloat(form.paddingTop) || 0;
      // Giấu tới hết mép dưới ô chọn cửa hàng: chừa lại đúng khoảng cách giữa hai hàng.
      const gap = parseFloat(form.rowGap) || 0;
      const hide = row.offsetTop > padTop + 4 ? row.offsetTop - gap : 0;
      el.style.top = `-${hide}px`;
      root.style.setProperty("--store-bar-h", `${el.offsetHeight - hide}px`);
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Đổi cửa hàng thêm mục vào lịch sử; gõ tìm mã chỉ thay mục hiện tại (Back không phải lùi từng chữ).
  const go = (patch: Partial<CatalogParams>, hash = "") =>
    navigate(patch, {
      hash,
      mode: patch.store !== undefined || patch.kv !== undefined ? "push" : "replace",
    });

  const regions = sortRegions(stores.map((s) => s.region));
  const kv = params.kv && regions.find((r) => sameRegion(r, params.kv)) ? params.kv : null;
  // Đã chọn khu vực: chỉ còn cửa hàng của khu vực đó (giữ cửa hàng đang chọn nếu link cũ lệch khu vực).
  const shownStores = kv
    ? stores.filter(
        (s) => sameRegion(s.region, kv) || s.code.toLowerCase() === params.store?.toLowerCase(),
      )
    : stores;

  return (
    <div
      ref={bar}
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
        <div className="relative flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-none">
          {/* Trang phân tích không có công tắc và không cần các gợi ý này; chế độ hình không có số để xem. */}
          <CoachHint
            id="store"
            title="Chọn cửa hàng của bạn"
            enabled={showPhotoSwitch && !params.photo && !params.store}
            className="top-full left-0 mt-2.5"
          >
            Để xem số đặt, về và còn thiếu của riêng cửa hàng mình.
          </CoachHint>
          <Store className="text-brand size-5 shrink-0" aria-hidden />
          <span className="hidden font-semibold whitespace-nowrap lg:inline">Cửa hàng của bạn</span>
          {regions.length > 0 && (
            <select
              aria-label="Khu vực"
              data-testid="region-select"
              value={kv ?? ""}
              onChange={(e) => {
                const next = e.target.value || null;
                const current = stores.find(
                  (s) => s.code.toLowerCase() === params.store?.toLowerCase(),
                );
                // Cửa hàng đang chọn không thuộc khu vực mới → bỏ chọn cửa hàng.
                const keepStore = !next || (current && sameRegion(current.region, next));
                go(keepStore ? { kv: next } : { kv: next, store: null });
              }}
              className={cn(
                "border-brand text-ink focus-visible:outline-brand min-h-11 w-[7.5rem] shrink-0 rounded-lg border-2 px-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-32",
                kv ? "bg-gold-soft" : "bg-white",
              )}
            >
              <option value="">Mọi khu vực</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {regionLabel(r)}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Cửa hàng của bạn"
            value={params.store ?? ""}
            onChange={(e) => go({ store: e.target.value || null })}
            className="border-brand bg-gold-soft text-ink focus-visible:outline-brand min-h-11 min-w-0 flex-1 rounded-lg border-2 px-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-64 sm:flex-none"
          >
            <option value="">Tất cả cửa hàng</option>
            {shownStores.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <label ref={searchRow} className="relative flex min-w-0 flex-1 basis-40 items-center">
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
          <CoachHint
            id="search"
            title="Tìm nhanh theo mã"
            enabled={showPhotoSwitch && !params.q}
            className="top-full left-0 mt-2.5"
          >
            Nhập mã sản phẩm để tìm ngay, không cần lướt danh sách.
          </CoachHint>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="press bg-gold text-gold-fg hover:bg-gold-dark focus-visible:outline-brand min-h-11 rounded-full px-5 font-semibold hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70"
        >
          Tìm
        </button>
        {showPhotoSwitch && <PhotoSwitch />}
      </form>
    </div>
  );
}
