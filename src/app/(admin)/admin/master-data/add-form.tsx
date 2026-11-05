"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { MasterKind } from "@/server/services/master-data";
import { createItemAction } from "./actions";

const inputClass =
  "h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm outline-none focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20";

/** Form thêm nhanh một dòng: tên (và mã với cửa hàng; nhãn cố định với dòng / BST). */
export function AddForm({
  kind,
  brandId,
  label,
}: {
  kind: MasterKind;
  /** Bắt buộc với dòng / BST: mục mới thuộc nhãn này. */
  brandId?: string;
  /** Ví dụ "Thêm dòng hàng" — dùng làm tên nút và nhãn truy cập. */
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await createItemAction(kind, {
        name: String(formData.get("name") ?? ""),
        code: kind === "store" ? String(formData.get("code") ?? "") : undefined,
        region: kind === "store" ? String(formData.get("region") ?? "") : undefined,
        brandId,
      });
      if (r.ok) formRef.current?.reset();
      else setError(r.error);
    });
  }

  return (
    <form ref={formRef} action={submit} aria-label={label} className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {kind === "store" && (
          <input
            name="code"
            placeholder="Mã (VD CH01)"
            aria-label="Mã cửa hàng"
            required
            className={`${inputClass} w-32`}
          />
        )}
        <input
          name="name"
          placeholder={kind === "store" ? "Tên cửa hàng" : "Tên"}
          aria-label={kind === "store" ? "Tên cửa hàng mới" : `Tên — ${label}`}
          required
          className={`${inputClass} w-56`}
        />
        {kind === "store" && (
          <input
            name="region"
            placeholder="Khu vực (VD 1)"
            aria-label="Khu vực"
            list="store-regions"
            className={`${inputClass} w-32`}
          />
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang thêm…" : label}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
