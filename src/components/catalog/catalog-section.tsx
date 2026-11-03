import { X } from "lucide-react";
import Link from "next/link";
import {
  buildCatalogQuery,
  hasActiveFilter,
  NO_COLLECTION,
  PAGE_SIZE,
  type CatalogParams,
} from "@/lib/catalog-params";
import { formatInt } from "@/lib/format";
import { prisma } from "@/server/db";
import { listProducts } from "@/server/services/catalog";
import { ExportButton } from "./export-button";
import { ProductGrid } from "./product-grid";
import { ProductTable } from "./product-table";

/** Phần "Tất cả sản phẩm": nhãn phạm vi, xuất Excel, danh sách, Xem thêm (nút Lưới/Bảng ở ViewToggle). */
export async function CatalogSection({ params }: { params: CatalogParams }) {
  const { items, total, scope } = await listProducts({
    ...params,
    limit: params.n,
  });

  const scopeLabel =
    scope.kind === "total" ? "Tất cả cửa hàng" : `Cửa hàng: ${scope.name} (${scope.code})`;

  const collectionNames = await selectedCollectionNames(params.col);

  return (
    <>
      {collectionNames.length > 0 && (
        <div
          data-testid="collection-banner"
          className="bg-gold-soft border-gold mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5"
        >
          <p className="text-[15px]">
            Đang xem bộ sưu tập: <b className="font-semibold">{collectionNames.join(", ")}</b> ·{" "}
            {formatInt(total)} SP
          </p>
          <Link
            href={`${buildCatalogQuery({ ...params, col: [], n: undefined }) || "?"}#san-pham`}
            scroll={false}
            className="text-brand inline-flex min-h-11 items-center gap-1 font-semibold hover:underline md:min-h-9"
          >
            Bỏ lọc
            <X className="size-4" aria-hidden />
          </Link>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p data-testid="scope-label" role="status" className="text-ink-muted text-[15px]">
          <b className="text-ink font-semibold">{scopeLabel}</b> · {formatInt(total)} SP
        </p>
        <div className="flex items-center gap-2">
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

/** Tên các BST đang lọc (theo thứ tự trên URL) để hiện ở dải "Đang xem bộ sưu tập". */
async function selectedCollectionNames(col: string[]): Promise<string[]> {
  if (col.length === 0) return [];
  const ids = col.filter((c) => c !== NO_COLLECTION);
  const rows = ids.length
    ? await prisma.collection.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r.name]));
  return col.flatMap((c) => {
    const name = c === NO_COLLECTION ? "Ngoài bộ sưu tập" : byId.get(c);
    return name ? [name] : [];
  });
}
