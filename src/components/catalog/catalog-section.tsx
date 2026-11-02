import { LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { buildCatalogQuery, PAGE_SIZE, type CatalogParams } from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listProducts } from "@/server/services/catalog";
import { ProductGrid } from "./product-grid";
import { ProductTable } from "./product-table";

/** Có bộ lọc/tìm kiếm nào đang áp dụng không (để quyết định hiện nút Xóa lọc). */
function hasActiveFilter(p: CatalogParams) {
  return Boolean(p.store || p.q || p.col.length);
}

/** Phần "Tất cả sản phẩm": nhãn phạm vi, chuyển Lưới/Bảng, danh sách, Xem thêm. */
export async function CatalogSection({ params }: { params: CatalogParams }) {
  const { items, total, scope } = await listProducts({
    store: params.store,
    all: params.all,
    q: params.q,
    col: params.col,
    limit: params.n,
  });

  const scopeLabel =
    scope.kind === "total" ? "Tổng hệ thống" : `Cửa hàng: ${scope.name} (${scope.code})`;
  const viewHref = (view: CatalogParams["view"]) => buildCatalogQuery({ ...params, view }) || "?";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p data-testid="scope-label" className="text-ink-muted text-[15px]">
          <b className="text-ink font-semibold">{scopeLabel}</b> · {formatInt(total)} SP
        </p>
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
      </div>

      {total === 0 ? (
        <EmptyState canClear={hasActiveFilter(params)} />
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

function EmptyState({ canClear }: { canClear: boolean }) {
  return (
    <div
      data-testid="empty-state"
      className="border-line rounded-xl border border-dashed bg-white px-4 py-14 text-center"
    >
      <p className="font-display text-xl font-semibold">Không có sản phẩm phù hợp</p>
      <p className="text-ink-muted mt-1">
        {canClear ? "Hãy thử bỏ bớt điều kiện lọc." : "Danh mục hiện chưa có sản phẩm nào."}
      </p>
      {canClear && (
        <Link
          href="/#san-pham"
          className="bg-gold text-gold-fg hover:bg-gold-dark mt-5 inline-flex min-h-11 items-center rounded-full px-6 font-semibold hover:text-white"
        >
          Xóa lọc
        </Link>
      )}
    </div>
  );
}
