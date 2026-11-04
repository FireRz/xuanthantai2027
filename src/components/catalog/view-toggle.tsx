import { Image as ImageIcon, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import { cn } from "@/lib/utils";

/** Nút chuyển Lưới/Bảng, đặt ngang dòng tiêu đề "Tất cả sản phẩm". */
export function ViewToggle({ params }: { params: CatalogParams }) {
  const viewHref = (view: CatalogParams["view"]) => buildCatalogQuery({ ...params, view }) || "?";
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className="border-line inline-flex shrink-0 rounded-full border bg-white p-0.5 text-sm font-medium"
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
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5",
            params.view === view ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}

/** Công tắc "Chỉ xem hình": ẩn mọi số lượng/trạng thái, giữ nguyên bộ lọc đang xem. */
export function PhotoModeToggle({ params }: { params: CatalogParams }) {
  const href = buildCatalogQuery({ ...params, photo: !params.photo, n: undefined }) || "?";
  return (
    <Link
      href={href}
      scroll={false}
      replace
      aria-pressed={params.photo}
      className={cn(
        "border-line inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium",
        params.photo
          ? "bg-brand border-brand text-white"
          : "text-ink-muted hover:text-ink bg-white",
      )}
    >
      <ImageIcon className="size-4" aria-hidden />
      <span className="sm:hidden">Hình</span>
      <span className="hidden sm:inline">Chỉ xem hình</span>
    </Link>
  );
}
