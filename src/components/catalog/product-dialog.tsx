"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";
import { isMorphing, morphClose } from "./hero-transition";
import { popupTrail } from "./product-link";

/**
 * Khung cửa sổ nổi (F05, UI-DESIGN §5.5): máy tính = cửa sổ giữa màn hình, điện thoại = toàn màn hình.
 * Dùng thẻ <dialog> gốc: Esc, giữ tiêu điểm trong cửa sổ, nền phía sau không bấm được.
 * Đóng (nút ✕, Esc, bấm ngoài) = bỏ `sp` khỏi URL nhưng giữ nguyên các tham số lọc;
 * nút Back của trình duyệt tự đóng vì `sp` biến mất khỏi URL.
 */
export function ProductDialog({
  title,
  prev,
  next,
  children,
}: {
  title: string;
  /** Máy tính: nút Sản phẩm trước/sau đặt hai bên ngoài khung popup (trên nền mờ). */
  prev?: React.ReactNode;
  next?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { state, hrefFor } = useCatalogNav();
  // Mở bằng ảnh bay (View Transitions) thì bỏ hiệu ứng mở riêng: nếu chỉ tắt bằng CSS trong lúc bay,
  // hiệu ứng sẽ chạy lại từ đầu ngay khi bay xong.
  const [plain] = useState(isMorphing);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden"; // khóa cuộn trang nền, giữ nguyên vị trí cuộn
    return () => {
      html.style.overflow = prevOverflow;
      const trigger = popupTrail.trigger;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  function close() {
    // SP đang xem (đã lướt sang SP khác thì là SP đó) → ảnh bay về đúng thẻ của nó nếu thẻ đang hiện.
    const sku =
      ref.current?.querySelector("[data-testid=product-detail]")?.getAttribute("data-sku") ?? "";
    morphClose(sku, () => {
      if (popupTrail.openedInApp) {
        popupTrail.openedInApp = false;
        router.back();
      } else {
        router.replace(hrefFor({ ...state, sp: null }), { scroll: false });
      }
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="product-dialog-title"
      data-testid="product-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        // Bấm vùng nền mờ phía ngoài khung (sự kiện rơi vào thẻ dialog hoặc hàng chứa khung + nút hai bên).
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.hasAttribute("data-dialog-gutter")) close();
      }}
      // Thẻ dialog trong suốt; khung trắng là phần tử con, hai bên (máy tính) là nút chuyển SP.
      className={cn(
        !plain && "animate-in fade-in zoom-in-95 max-md:slide-in-from-bottom-10 duration-200",
        "text-ink m-auto h-auto max-h-[92vh] max-w-[100vw] overflow-visible bg-transparent p-0 backdrop:bg-[rgba(43,26,18,.55)] motion-reduce:animate-none max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-dvw md:open:flex",
      )}
    >
      <div
        data-dialog-gutter
        className="flex min-h-0 w-full items-center gap-4 max-md:h-full md:px-2"
      >
        {prev}
        <div
          data-testid="product-dialog-card"
          className="flex max-h-[92vh] w-[860px] max-w-[calc(100vw-9rem)] min-w-0 flex-col overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl max-md:h-full max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none md:overflow-hidden md:has-[[data-photo]]:h-fit"
        >
          <div className="border-line sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3 md:px-6 md:py-4">
            <h2
              id="product-dialog-title"
              className="font-display text-xl font-semibold md:text-2xl"
              data-testid="product-dialog-title"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Đóng"
              data-testid="product-dialog-close"
              className="text-ink-muted hover:bg-gold-soft hover:text-ink flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          {children}
        </div>
        {next}
      </div>
    </dialog>
  );
}
