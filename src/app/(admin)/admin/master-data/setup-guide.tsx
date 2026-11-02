import Link from "next/link";
import { getSetupSteps, isSetupComplete, type MasterDataCounts } from "@/lib/setup-guide";

/**
 * Hướng dẫn thứ tự nhập (T06.6). Mở sẵn khi còn thiếu bước bắt buộc (vd. CSDL trống),
 * thu gọn khi đã đủ để không chiếm chỗ.
 */
export function SetupGuide({ counts }: { counts: MasterDataCounts }) {
  const steps = getSetupSteps(counts);
  const complete = isSetupComplete(counts);
  return (
    <details
      open={!complete}
      className="rounded-xl border border-neutral-200 bg-white p-5"
      data-testid="setup-guide"
    >
      <summary className="cursor-pointer font-semibold">Hướng dẫn thứ tự nhập</summary>
      {!complete && counts.brands + counts.stores + counts.lines === 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Hệ thống chưa có danh mục nào. Làm lần lượt các bước dưới đây trước khi nhập sản phẩm.
        </p>
      )}
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-3 text-sm" data-done={s.done}>
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                s.done ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div>
              <p className="font-medium">
                {s.href ? (
                  <Link href={s.href} className="text-[#B3261E] hover:underline">
                    {s.title}
                  </Link>
                ) : (
                  s.title
                )}
                {s.optional && (
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    (không bắt buộc)
                  </span>
                )}
                {s.done && <span className="sr-only"> — đã xong</span>}
              </p>
              <p className="text-neutral-600">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
