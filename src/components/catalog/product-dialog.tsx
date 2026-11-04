"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCatalogNav } from "./catalog-nav";
import { popupTrail } from "./product-link";

/**
 * Khung cửa sổ nổi (F05, UI-DESIGN §5.5): máy tính = cửa sổ giữa màn hình, điện thoại = toàn màn hình.
 * Dùng thẻ <dialog> gốc: Esc, giữ tiêu điểm trong cửa sổ, nền phía sau không bấm được.
 * Đóng (nút ✕, Esc, bấm ngoài) = bỏ `sp` khỏi URL nhưng giữ nguyên các tham số lọc;
 * nút Back của trình duyệt tự đóng vì `sp` biến mất khỏi URL.
 */
export function ProductDialog({ title, children }: { title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { state, hrefFor } = useCatalogNav();

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
    if (popupTrail.openedInApp) {
      popupTrail.openedInApp = false;
      router.back();
    } else {
      router.replace(hrefFor({ ...state, sp: null }), { scroll: false });
    }
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
        // Bấm vùng nền mờ phía ngoài cửa sổ (sự kiện rơi vào chính thẻ dialog).
        if (e.target === e.currentTarget) close();
      }}
      className="animate-in fade-in zoom-in-95 max-md:slide-in-from-bottom-10 text-ink m-auto h-auto max-h-[92vh] w-[860px] max-w-[94vw] overflow-y-auto overscroll-contain rounded-2xl bg-white p-0 shadow-2xl duration-200 backdrop:bg-[rgba(43,26,18,.55)] motion-reduce:animate-none max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-dvw max-md:max-w-none max-md:rounded-none md:overflow-hidden md:open:flex md:open:flex-col md:has-[[data-photo]]:h-fit"
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
    </dialog>
  );
}
