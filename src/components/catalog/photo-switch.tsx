"use client";

import { ChartColumn, Image as ImageIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";
import { dismissHint, HINT_BUBBLE, useCoachHint } from "./coach-hints";

/**
 * Công tắc gạt "Chỉ xem hình" (ADR-011) trên thanh cửa hàng: ẩn mọi số lượng/trạng thái, giữ nguyên bộ lọc.
 * Lần đầu vào trang, bong bóng gợi ý hiện theo lượt trong hàng đợi gợi ý (coach-hints);
 * máy tính rê chuột / Tab vào công tắc cũng hiện lại. Bong bóng không nhận chuột để không che nút bên dưới.
 * Bong bóng căn theo mép phải công tắc, nên công tắc phải luôn sát mép phải thanh (`ml-auto`, kể cả khi
 * rớt xuống hàng riêng) — nếu không bong bóng tràn ra ngoài mép trái màn hình.
 */
export function PhotoSwitch() {
  const { state, go } = useCatalogNav();
  const on = state.photo;
  const root = useRef<HTMLDivElement>(null);
  const hint = useCoachHint("photo", root);

  return (
    <div ref={root} className="group relative ml-auto flex shrink-0 items-center gap-2">
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
          dismissHint("photo");
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
          HINT_BUBBLE,
          "top-full right-0 mt-2.5",
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
