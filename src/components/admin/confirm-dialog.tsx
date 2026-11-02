"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Hộp xác nhận dùng thẻ <dialog> gốc: tự khóa focus, Esc đóng. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40"
    >
      <div className="space-y-3 p-5">
        <h2 id="confirm-title" className="text-base font-semibold">
          {title}
        </h2>
        <div className="text-sm text-neutral-700">{children}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button
          type="button"
          variant={danger ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Đang xử lý…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
