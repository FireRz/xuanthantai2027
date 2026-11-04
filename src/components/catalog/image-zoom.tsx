"use client";

import { X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bấm ảnh trong popup SP → lớp phóng to toàn màn hình (cả chế độ đầy đủ lẫn chế độ hình).
 * Lớp phóng to là <dialog> thứ hai lồng trên popup: top layer xếp chồng nên Esc chỉ đóng lớp trên cùng.
 * `data-testid="image-zoom"` + thuộc tính `open` gốc: bộ chuyển SP dùng để bỏ qua phím ←/→ và vuốt khi đang phóng to.
 * `src` null (chưa có ảnh) → trả `children` nguyên trạng, không bấm được.
 */
export function ImageZoom({
  src,
  alt,
  className,
  children,
}: {
  src: string | null;
  alt: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  if (!src) return <>{children}</>;

  function close() {
    setOpen(false);
    setZoomed(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function toggleZoom(e: React.MouseEvent<HTMLImageElement>) {
    // Chỉ máy tính (con trỏ chuột): bật/tắt phóng 2× tại điểm bấm. Điện thoại dùng chụm hai ngón của trình duyệt.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(
      `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
    );
    setZoomed((z) => !z);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Phóng to ảnh ${alt}`}
        onClick={() => setOpen(true)}
        className={cn("relative mx-auto block w-full cursor-zoom-in", className)}
      >
        {children}
        <span
          aria-hidden
          className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white"
        >
          <ZoomIn className="size-4" />
        </span>
      </button>
      {open && (
        <dialog
          ref={dialogRef}
          data-testid="image-zoom"
          aria-label={`Ảnh ${alt}`}
          onCancel={(e) => {
            // Chặn Esc lan sang popup SP: chỉ đóng lớp phóng to.
            e.preventDefault();
            e.stopPropagation();
            close();
          }}
          onClick={(e) => {
            // Bấm nền (ngoài ảnh) cũng đóng; chặn nổi bọt lên popup SP.
            e.stopPropagation();
            if (e.target !== e.currentTarget && e.target !== e.currentTarget.firstElementChild)
              return;
            close();
          }}
          className="animate-in fade-in zoom-in-95 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-black/90 p-0 duration-200 backdrop:bg-transparent motion-reduce:animate-none"
        >
          <div className="flex size-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={toggleZoom}
              style={{ transformOrigin: origin, touchAction: "pinch-zoom" }}
              className={cn(
                "max-h-dvh max-w-dvw object-contain transition-transform duration-200 motion-reduce:transition-none",
                zoomed ? "scale-200 cursor-zoom-out" : "cursor-zoom-in",
              )}
            />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng ảnh"
            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
          >
            <X className="size-6" aria-hidden />
          </button>
        </dialog>
      )}
    </>
  );
}
