import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";
import { CoachHint } from "./coach-hints";

/** Nút chuyển Lưới/Bảng, đặt ngang dòng tiêu đề "Tất cả sản phẩm". */
export function ViewToggle({ params }: { params: CatalogParams }) {
  const viewHref = (view: CatalogParams["view"]) => buildCatalogQuery({ ...params, view }) || "?";
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className="border-line relative inline-flex shrink-0 rounded-full border bg-white p-0.5 text-sm font-medium"
    >
      {(
        [
          ["grid", "Lưới", LayoutGrid],
          ["list", "Bảng", List],
        ] as const
      ).map(([view, label, Icon]) => (
        <Link
          key={view}
          href={viewHref(view)}
          scroll={false}
          replace
          aria-current={params.view === view ? "true" : undefined}
          className={cn(
            "press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5",
            params.view === view ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
      <CoachHint
        id="view"
        title="Xem dạng bảng"
        enabled={params.view === "grid" && !params.photo}
        arrow="right"
        className="top-full right-0 mt-2.5"
      >
        Bấm Bảng để xem nhiều số cùng lúc trên một màn hình.
      </CoachHint>
    </div>
  );
}
