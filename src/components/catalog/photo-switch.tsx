"use client";

import { ChartColumn, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";

/** Khóa localStorage: đã hiện gợi ý lần đầu cho công tắc "Chỉ xem hình". */
export const PHOTO_HINT_KEY = "xtt-photo-hint-seen";
/** Gợi ý lần đầu tự tắt sau (ms). */
const HINT_MS = 9000;

/**
 * Công tắc gạt "Chỉ xem hình" (ADR-011) trên thanh cửa hàng: ẩn mọi số lượng/trạng thái, giữ nguyên bộ lọc.
 * Lần đầu vào trang hiện bong bóng gợi ý (tự tắt sau vài giây hoặc khi chạm bất kỳ đâu);
 * máy tính rê chuột / Tab vào công tắc cũng hiện lại. Bong bóng không nhận chuột để không che nút bên dưới.
 * Bong bóng căn theo mép phải công tắc, nên công tắc phải luôn sát mép phải thanh (`ml-auto`, kể cả khi
 * rớt xuống hàng riêng) — nếu không bong bóng tràn ra ngoài mép trái màn hình.
 */
export function PhotoSwitch() {
  const { state, go } = useCatalogNav();
  const on = state.photo;
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(PHOTO_HINT_KEY) === "1";
      if (!seen) localStorage.setItem(PHOTO_HINT_KEY, "1");
    } catch {
      // Trình duyệt chặn lưu trữ: bỏ qua gợi ý.
    }
    if (seen) return;
    setHint(true);
    const close = () => setHint(false);
    const t = setTimeout(close, HINT_MS);
    window.addEventListener("pointerdown", close, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", close);
    };
  }, []);

  return (
    <div className="group relative ml-auto flex shrink-0 items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "hidden text-sm font-medium whitespace-nowrap select-none sm:inline",
          on ? "text-gold-dark" : "text-ink-muted",
        )}
      >
        {on ? "Chỉ xem hình" : "Ẩn số lượng"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Chỉ xem hình"
        data-testid="photo-switch"
        onClick={() => {
          setHint(false);
          go({ photo: !on });
        }}
        className={cn(
          "focus-visible:outline-brand relative h-8 w-14 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          on ? "bg-gold border-gold-dark" : "bg-gold-soft border-line",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 left-0.5 flex size-6 items-center justify-center rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
            on ? "text-gold-dark translate-x-6" : "text-ink-muted",
          )}
        >
          {on ? <ImageIcon className="size-3.5" /> : <ChartColumn className="size-3.5" />}
        </span>
      </button>
      <div
        role="tooltip"
        data-testid="photo-hint"
        className={cn(
          "border-gold text-ink pointer-events-none absolute top-full right-0 z-40 mt-2.5 w-64 rounded-xl border bg-white px-3.5 py-2.5 text-[13px] leading-snug shadow-lg",
          "before:border-gold before:absolute before:-top-1.5 before:right-5 before:size-3 before:rotate-45 before:border-t before:border-l before:bg-white",
          hint ? "block" : "hidden md:group-hover:block md:group-has-[:focus-visible]:block",
        )}
      >
        <b className="text-navy font-semibold">Chỉ xem hình</b>
        <br />
        Ẩn số đặt, về, bán, tồn — chỉ giữ hình và thông tin sản phẩm.
      </div>
    </div>
  );
}
