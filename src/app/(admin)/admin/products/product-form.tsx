"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FormMessage } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import { createProductAction, updateProductAction } from "./actions";

export interface FormOptions {
  brands: {
    id: string;
    name: string;
    lines: { id: string; name: string }[];
    collections: { id: string; name: string }[];
  }[];
  materials: { id: string; name: string }[];
  priceRanges: { id: string; name: string }[];
}

export interface ProductFormValues {
  id: string;
  sku: string;
  name: string;
  brandId: string;
  productLineId: string;
  collectionId: string;
  materialId: string;
  priceRangeId: string;
  priceVnd: string;
}

const EMPTY: ProductFormValues = {
  id: "",
  sku: "",
  name: "",
  brandId: "",
  productLineId: "",
  collectionId: "",
  materialId: "",
  priceRangeId: "",
  priceVnd: "",
};

const inputCls =
  "mt-1 block h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:bg-neutral-100 disabled:text-neutral-500";

/** Form thêm / sửa SP. Khi sửa, mã chỉ đọc (ADR-008 P1). Dòng và BST lọc theo nhãn đã chọn. */
export function ProductForm({
  options,
  initial,
}: {
  options: FormOptions;
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const editing = !!initial;
  const [v, setV] = useState<ProductFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const brand = useMemo(() => options.brands.find((b) => b.id === v.brandId), [options, v.brandId]);
  const set = (patch: Partial<ProductFormValues>) => {
    setSaved(false);
    setV((cur) => ({ ...cur, ...patch }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const payload = {
      sku: v.sku,
      name: v.name,
      brandId: v.brandId,
      productLineId: v.productLineId,
      collectionId: v.collectionId,
      materialId: v.materialId,
      priceRangeId: v.priceRangeId,
      priceVnd: v.priceVnd,
    };
    start(async () => {
      const r = editing
        ? await updateProductAction(v.id, payload)
        : await createProductAction(payload);
      if (!r.ok) return setError(r.error);
      if (editing) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/products/${r.data!.id}?created=1`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4" noValidate>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {saved && <FormMessage kind="success">Đã lưu thay đổi.</FormMessage>}

      <label className="block text-sm font-medium">
        Mã sản phẩm *
        <input
          name="sku"
          value={v.sku}
          onChange={(e) => set({ sku: e.target.value })}
          readOnly={editing}
          className={`${inputCls} ${editing ? "bg-neutral-100 text-neutral-600" : ""}`}
        />
        {editing && (
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Mã không sửa được. Nhập sai mã: ẩn sản phẩm này và tạo sản phẩm mới.
          </span>
        )}
      </label>

      <label className="block text-sm font-medium">
        Tên sản phẩm
        <input
          name="name"
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
          className={inputCls}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Nhãn hàng *
          <select
            name="brandId"
            value={v.brandId}
            onChange={(e) => set({ brandId: e.target.value, productLineId: "", collectionId: "" })}
            className={inputCls}
          >
            <option value="">— Chọn nhãn —</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Dòng hàng *
          <select
            name="productLineId"
            value={v.productLineId}
            onChange={(e) => set({ productLineId: e.target.value })}
            disabled={!brand}
            className={inputCls}
          >
            <option value="">{brand ? "— Chọn dòng —" : "Chọn nhãn trước"}</option>
            {brand?.lines.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Bộ sưu tập
          <select
            name="collectionId"
            value={v.collectionId}
            onChange={(e) => set({ collectionId: e.target.value })}
            disabled={!brand}
            className={inputCls}
          >
            <option value="">Không thuộc BST</option>
            {brand?.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Tuổi vàng
          <select
            name="materialId"
            value={v.materialId}
            onChange={(e) => set({ materialId: e.target.value })}
            className={inputCls}
          >
            <option value="">—</option>
            {options.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Khung giá
          <select
            name="priceRangeId"
            value={v.priceRangeId}
            onChange={(e) => set({ priceRangeId: e.target.value })}
            className={inputCls}
          >
            <option value="">—</option>
            {options.priceRanges.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Giá bán lẻ (VND)
          <input
            name="priceVnd"
            inputMode="numeric"
            value={v.priceVnd}
            onChange={(e) => set({ priceVnd: e.target.value })}
            placeholder="VD: 12500000"
            className={inputCls}
          />
        </label>
      </div>

      <Button type="submit" disabled={pending} className="h-10">
        {pending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm sản phẩm"}
      </Button>
    </form>
  );
}
