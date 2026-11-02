import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import {
  buildCatalogQuery,
  hasActiveFilter,
  PAGE_SIZE,
  type CatalogParams,
} from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listProducts } from "@/server/services/catalog";
import { ExportButton } from "./export-button";
import { ProductGrid } from "./product-grid";
import { ProductTable } from "./product-table";

/** Phần "Tất cả sản phẩm": nhãn phạm vi, chuyển Lưới/Bảng, danh sách, Xem thêm. */
export async function CatalogSection({ params }: { params: CatalogParams }) {
  const { items, total, scope } = await listProducts({
    ...params,
    limit: params.n,
  });

  const scopeLabel =
    scope.kind === "total" ? "Tổng hệ thống" : `Cửa hàng: ${scope.name} (${scope.code})`;
  const viewHref = (view: CatalogParams["view"]) => buildCatalogQuery({ ...params, view }) || "?";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p data-testid="scope-label" role="status" className="text-ink-muted text-[15px]">
          <b className="text-ink font-semibold">{scopeLabel}</b> · {formatInt(total)} SP
        </p>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Kiểu hiển thị"
            className="border-line inline-flex rounded-full border bg-white p-0.5 text-sm font-medium"
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
          <ExportButton params={params} />
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          canClear={hasActiveFilter(params)}
          clearHref={`${buildCatalogQuery({ sort: params.sort, view: params.view })}#san-pham`}
          storeOnly={Boolean(params.store && !params.all && scope.kind === "store")}
        />
      ) : (
        <>
          {params.view === "list" ? <ProductTable items={items} /> : <ProductGrid items={items} />}
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-ink-muted text-sm" data-testid="shown-count">
              Đang hiển thị {formatInt(items.length)} / {formatInt(total)} SP
            </p>
            {items.length < total && (
              <Link
                href={buildCatalogQuery({ ...params, n: params.n + PAGE_SIZE })}
                scroll={false}
                className="bg-gold text-gold-fg hover:bg-gold-dark inline-flex min-h-11 items-center rounded-full px-6 font-semibold hover:text-white"
              >
                Xem thêm
              </Link>
            )}
          </div>
        </>
      )}
    </>
  );
}

function EmptyState({
  canClear,
  clearHref,
  storeOnly,
}: {
  canClear: boolean;
  clearHref: string;
  /** Đang xem một cửa hàng ở chế độ mặc định (chỉ SP cửa hàng đó đặt). */
  storeOnly: boolean;
}) {
  return (
    <div
      data-testid="empty-state"
      className="border-line rounded-xl border border-dashed bg-white px-4 py-14 text-center"
    >
      <p className="font-display text-xl font-semibold">Không có sản phẩm phù hợp</p>
      <p className="text-ink-muted mt-1">
        {canClear ? "Hãy thử bỏ bớt điều kiện lọc." : "Danh mục hiện chưa có sản phẩm nào."}
        {storeOnly && ' Bật "Xem tất cả SP" để xem cả sản phẩm cửa hàng này chưa đặt.'}
      </p>
      {canClear && (
        <Link
          href={`/${clearHref}`}
          className="bg-gold text-gold-fg hover:bg-gold-dark mt-5 inline-flex min-h-11 items-center rounded-full px-6 font-semibold hover:text-white"
        >
          Xóa lọc
        </Link>
      )}
    </div>
  );
}
