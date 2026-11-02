import { isAcceptedImage } from "@/lib/image-resize";

/**
 * Đối chiếu file ảnh với mã SP khi tải hàng loạt (ADR-006, ADR-008 P3):
 * tên file bỏ đuôi = mã SP, không phân biệt hoa/thường.
 */

export interface BatchFile {
  /** Tên file (không kèm thư mục). */
  name: string;
  blob: Blob;
}

export interface KnownProduct {
  id: string;
  sku: string;
  hasImage: boolean;
}

/** "NTT001.jpg" → "NTT001". Tên có nhiều dấu chấm chỉ bỏ đuôi cuối. */
export function skuFromFileName(name: string): string {
  return name
    .replace(/\.[^.]*$/, "")
    .trim()
    .toUpperCase();
}

export type BatchEntry =
  | { kind: "matched"; file: BatchFile; product: KnownProduct; replaces: boolean }
  | { kind: "unmatched"; file: BatchFile; reason: string }
  | { kind: "duplicate"; file: BatchFile; sku: string }
  | { kind: "invalid"; file: BatchFile; reason: string };

export interface BatchPlan {
  entries: BatchEntry[];
  matched: Extract<BatchEntry, { kind: "matched" }>[];
  unmatched: Extract<BatchEntry, { kind: "unmatched" }>[];
  duplicates: Extract<BatchEntry, { kind: "duplicate" }>[];
  invalid: Extract<BatchEntry, { kind: "invalid" }>[];
}

/** Mã SP (đã chuẩn hóa) xuất hiện trong danh sách file hợp lệ — dùng để hỏi server. */
export function candidateSkus(files: BatchFile[]): string[] {
  const set = new Set<string>();
  for (const f of files)
    if (isAcceptedImage({ name: f.name, type: f.blob.type })) {
      const sku = skuFromFileName(f.name);
      if (sku) set.add(sku);
    }
  return [...set];
}

/**
 * Xếp từng file vào: khớp / không khớp / trùng mã / không hợp lệ.
 * Hai file cùng mã → cả hai vào "trùng mã" và KHÔNG file nào được gắn (không đoán ảnh nào đúng).
 */
export function planBatch(files: BatchFile[], products: KnownProduct[]): BatchPlan {
  const bySku = new Map(products.map((p) => [p.sku.toUpperCase(), p]));
  const counts = new Map<string, number>();
  for (const f of files) {
    if (!isAcceptedImage({ name: f.name, type: f.blob.type })) continue;
    const k = skuFromFileName(f.name);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const entries: BatchEntry[] = files.map((file): BatchEntry => {
    if (!isAcceptedImage({ name: file.name, type: file.blob.type })) {
      return { kind: "invalid", file, reason: "Không phải ảnh JPG, PNG hoặc WEBP" };
    }
    const sku = skuFromFileName(file.name);
    if (!sku) return { kind: "unmatched", file, reason: "Tên file trống" };
    if ((counts.get(sku) ?? 0) > 1) return { kind: "duplicate", file, sku };
    const product = bySku.get(sku);
    if (!product) {
      return { kind: "unmatched", file, reason: `Không có sản phẩm mã "${sku}"` };
    }
    return { kind: "matched", file, product, replaces: product.hasImage };
  });

  return {
    entries,
    matched: entries.filter((e) => e.kind === "matched"),
    unmatched: entries.filter((e) => e.kind === "unmatched"),
    duplicates: entries.filter((e) => e.kind === "duplicate"),
    invalid: entries.filter((e) => e.kind === "invalid"),
  };
}
