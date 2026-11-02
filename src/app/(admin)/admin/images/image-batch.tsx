"use client";

import { useRef, useState } from "react";
import { FormMessage } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import { candidateSkus, planBatch, type BatchPlan, type KnownProduct } from "@/lib/image-batch";
import { resizeAndUpload } from "@/lib/image-upload";
import { expandFiles } from "@/lib/image-zip";
import {
  attachImageAction,
  lookupSkusAction,
  productsWithoutImageAction,
} from "../products/actions";

const CONCURRENCY = 3;
const LOOKUP_CHUNK = 500;

type Phase = "idle" | "checking" | "preview" | "uploading" | "done";

interface Failure {
  name: string;
  reason: string;
}

interface Summary {
  count: number;
  skus: string[];
}

/** Chạy `worker` cho từng phần tử với tối đa `limit` tác vụ song song. */
async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  });
  await Promise.all(lanes);
}

/**
 * Tải ảnh hàng loạt (ADR-006): chọn nhiều file / thư mục / .zip → đối chiếu tên với mã SP →
 * xem trước → xác nhận → thu nhỏ và tải song song kèm thanh tiến trình.
 */
export function ImageBatch() {
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [zipErrors, setZipErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [noImage, setNoImage] = useState<Summary | null>(null);
  const [done, setDone] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [dragging, setDragging] = useState(false);

  function reset() {
    setPhase("idle");
    setPlan(null);
    setError(null);
    setZipErrors([]);
    setDone(0);
    setOkCount(0);
    setFailures([]);
  }

  async function onFiles(list: FileList | File[] | null) {
    const picked = list ? Array.from(list) : [];
    if (picked.length === 0) return;
    reset();
    setPhase("checking");
    try {
      const { files, errors } = await expandFiles(picked);
      setZipErrors(errors);
      const skus = candidateSkus(files);
      const known: KnownProduct[] = [];
      for (let i = 0; i < skus.length; i += LOOKUP_CHUNK) {
        const r = await lookupSkusAction(skus.slice(i, i + LOOKUP_CHUNK));
        if (!r.ok) throw new Error(r.error);
        known.push(...r.data!);
      }
      const summary = await productsWithoutImageAction();
      if (!summary.ok) throw new Error(summary.error);
      setNoImage(summary.data!);
      setPlan(planBatch(files, known));
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xử lý được các file đã chọn");
      setPhase("idle");
    }
  }

  async function start() {
    if (!plan || plan.matched.length === 0) return;
    setPhase("uploading");
    setDone(0);
    setOkCount(0);
    setFailures([]);
    await runPool(plan.matched, CONCURRENCY, async (entry) => {
      try {
        const up = await resizeAndUpload(entry.file.blob, entry.product.sku);
        const r = await attachImageAction(entry.product.id, up.imageUrl, up.thumbUrl);
        if (!r.ok) throw new Error(r.error);
        setOkCount((n) => n + 1);
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Tải lên thất bại";
        setFailures((f) => [...f, { name: entry.file.name, reason }]);
      } finally {
        setDone((n) => n + 1);
      }
    });
    const summary = await productsWithoutImageAction();
    if (summary.ok) setNoImage(summary.data!);
    setPhase("done");
  }

  const total = plan?.matched.length ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const replaced = plan?.matched.filter((m) => m.replaces).length ?? 0;
  const matchedSkus = new Set(plan?.matched.map((m) => m.product.sku.toUpperCase()));
  const stillMissing = noImage?.skus.filter((s) => !matchedSkus.has(s.toUpperCase())) ?? [];

  return (
    <div className="space-y-5">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {zipErrors.map((m) => (
        <FormMessage key={m} kind="error">
          {m}
        </FormMessage>
      ))}

      {(phase === "idle" || phase === "checking") && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void onFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-8 text-center ${
            dragging ? "border-[#B3261E] bg-red-50" : "border-neutral-300 bg-white"
          }`}
        >
          <p className="font-medium">Kéo thả ảnh hoặc file .zip vào đây</p>
          <p className="mt-1 text-sm text-neutral-600">hoặc chọn bằng nút bên dưới</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              disabled={phase === "checking"}
              onClick={() => filesInput.current?.click()}
            >
              {phase === "checking" ? "Đang đọc file…" : "Chọn ảnh hoặc .zip"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={phase === "checking"}
              onClick={() => folderInput.current?.click()}
            >
              Chọn thư mục
            </Button>
          </div>
          <input
            ref={filesInput}
            data-testid="batch-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.zip,application/zip"
            className="sr-only"
            aria-label="Chọn nhiều ảnh hoặc file zip"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInput}
            data-testid="batch-folder"
            type="file"
            multiple
            // @ts-expect-error webkitdirectory chưa có trong kiểu React chuẩn
            webkitdirectory=""
            className="sr-only"
            aria-label="Chọn thư mục ảnh"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {plan && phase !== "idle" && phase !== "checking" && (
        <section aria-label="Kết quả đối chiếu" className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Khớp" value={plan.matched.length} tone="ok" testId="stat-matched" />
            <Stat
              label="Không khớp"
              value={plan.unmatched.length}
              tone="bad"
              testId="stat-unmatched"
            />
            <Stat
              label="Trùng mã"
              value={plan.duplicates.length}
              tone="bad"
              testId="stat-duplicate"
            />
            <Stat
              label="Không phải ảnh"
              value={plan.invalid.length}
              tone="bad"
              testId="stat-invalid"
            />
            <Stat
              label="SP chưa có ảnh"
              value={
                noImage
                  ? noImage.count -
                    (phase === "done" ? 0 : plan.matched.filter((m) => !m.replaces).length)
                  : 0
              }
              tone="warn"
              testId="stat-noimage"
            />
          </dl>

          {replaced > 0 && phase === "preview" && (
            <p className="text-sm text-amber-800">
              {replaced} ảnh sẽ thay ảnh cũ của sản phẩm (ảnh cũ bị xóa).
            </p>
          )}

          <FileList
            title="Khớp"
            items={plan.matched.map((m) => ({
              name: m.file.name,
              note: `→ ${m.product.sku}${m.replaces ? " (thay ảnh cũ)" : ""}`,
            }))}
            testId="list-matched"
          />
          <FileList
            title="Không khớp mã SP nào"
            items={plan.unmatched.map((m) => ({ name: m.file.name, note: m.reason }))}
            testId="list-unmatched"
          />
          <FileList
            title="Trùng mã (không file nào được gắn)"
            items={plan.duplicates.map((m) => ({
              name: m.file.name,
              note: `Mã ${m.sku} có nhiều file`,
            }))}
            testId="list-duplicate"
          />
          <FileList
            title="Không phải ảnh"
            items={plan.invalid.map((m) => ({ name: m.file.name, note: m.reason }))}
            testId="list-invalid"
          />
          {stillMissing.length > 0 && (
            <details className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Sản phẩm chưa có ảnh
                {noImage && noImage.count > stillMissing.length
                  ? ` (hiện ${stillMissing.length}/${noImage.count})`
                  : ""}
              </summary>
              <p className="mt-2 break-words text-neutral-700">{stillMissing.join(", ")}</p>
            </details>
          )}

          {phase === "preview" && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={plan.matched.length === 0} onClick={start}>
                Tải lên {plan.matched.length} ảnh
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Chọn lại
              </Button>
            </div>
          )}

          {(phase === "uploading" || phase === "done") && (
            <div className="space-y-2">
              <div
                role="progressbar"
                aria-label="Tiến độ tải ảnh"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                className="h-3 overflow-hidden rounded-full bg-neutral-200"
              >
                <div className="h-full bg-[#B3261E] transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-sm" aria-live="polite">
                {phase === "uploading"
                  ? `Đang tải ${done}/${total} ảnh…`
                  : `Xong: ${okCount}/${total} ảnh đã gắn${failures.length ? `, ${failures.length} lỗi` : ""}.`}
              </p>
              {failures.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-red-800">
                  {failures.map((f) => (
                    <li key={f.name}>
                      {f.name}: {f.reason}
                    </li>
                  ))}
                </ul>
              )}
              {phase === "done" && (
                <Button type="button" variant="outline" onClick={reset}>
                  Tải thêm ảnh
                </Button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: "ok" | "bad" | "warn";
  testId: string;
}) {
  const color =
    value === 0
      ? "text-neutral-500"
      : tone === "ok"
        ? "text-green-800"
        : tone === "bad"
          ? "text-red-800"
          : "text-amber-800";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <dt className="text-xs text-neutral-600">{label}</dt>
      <dd data-testid={testId} className={`text-2xl font-semibold tabular-nums ${color}`}>
        {value}
      </dd>
    </div>
  );
}

function FileList({
  title,
  items,
  testId,
}: {
  title: string;
  items: { name: string; note: string }[];
  testId: string;
}) {
  if (items.length === 0) return null;
  return (
    <details
      open={items.length <= 12}
      className="rounded-lg border border-neutral-200 bg-white p-3 text-sm"
    >
      <summary className="cursor-pointer font-medium">
        {title} ({items.length})
      </summary>
      <ul data-testid={testId} className="mt-2 max-h-72 space-y-1 overflow-auto">
        {items.map((it, i) => (
          <li key={`${it.name}-${i}`} className="flex flex-wrap justify-between gap-2">
            <span className="break-all">{it.name}</span>
            <span className="text-neutral-600">{it.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
