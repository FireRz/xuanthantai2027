"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FormMessage } from "@/components/admin/form-controls";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { isAcceptedImage } from "@/lib/image-resize";
import { resizeAndUpload } from "@/lib/image-upload";
import { attachImageAction } from "./actions";

/**
 * Đổi ảnh một SP trong form sửa: thu nhỏ trên trình duyệt → tải thẳng lên Blob →
 * server gắn ảnh mới và xóa ảnh cũ (ADR-008 P3).
 */
export function ImageUploader({
  productId,
  sku,
  thumbUrl,
}: {
  productId: string;
  sku: string;
  thumbUrl: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDone(false);
    if (!isAcceptedImage(file)) {
      setError("Chỉ nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    setBusy(true);
    try {
      const up = await resizeAndUpload(file, sku);
      const r = await attachImageAction(productId, up.imageUrl, up.thumbUrl);
      if (!r.ok) throw new Error(r.error);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Ảnh sản phẩm" className="max-w-2xl space-y-3">
      <h2 className="text-base font-semibold">Ảnh sản phẩm</h2>
      <div className="flex items-center gap-4">
        <ProductImage thumbUrl={thumbUrl} alt={sku} className="h-28 w-28 rounded-md border" />
        <div className="space-y-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            className="sr-only"
            aria-label="Chọn ảnh mới"
            data-testid="image-input"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? "Đang tải ảnh…" : thumbUrl ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          <p className="text-xs text-neutral-500">
            JPG, PNG hoặc WEBP. Mỗi sản phẩm 1 ảnh; ảnh mới thay ảnh cũ. Tự thu nhỏ trước khi tải.
          </p>
        </div>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {done && <FormMessage kind="success">Đã cập nhật ảnh.</FormMessage>}
    </section>
  );
}
