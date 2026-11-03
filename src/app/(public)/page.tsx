import { BackToTop } from "@/components/catalog/back-to-top";
import { Suspense } from "react";
import { Banner } from "@/components/catalog/banner";
import { CatalogSection } from "@/components/catalog/catalog-section";
import { FilterSection } from "@/components/catalog/filter-section";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import {
  ProductDetailFallback,
  ProductDetailSection,
} from "@/components/catalog/product-detail-section";
import { ProductGridSkeleton } from "@/components/catalog/product-grid";
import { SiteFooter } from "@/components/catalog/site-footer";
import { StoreBar } from "@/components/catalog/store-bar";
import { ViewToggle } from "@/components/catalog/view-toggle";
import {
  buildCatalogQuery,
  parseCatalogParams,
  pruneInvalidSelections,
  type RawSearchParams,
} from "@/lib/catalog-params";
import { prisma } from "@/server/db";
import { listOwnedOptions } from "@/server/services/catalog";

// Danh mục đọc dữ liệu mới nhất ở mỗi lần xem (SL thay đổi sau mỗi lần nhập).
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const parsed = parseCatalogParams(await searchParams);
  const [owned, stores] = await Promise.all([
    listOwnedOptions(),
    prisma.store.findMany({
      where: { active: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);
  // Link cũ/gõ tay có dòng, BST không thuộc nhãn đang chọn (hoặc đã ẩn) → bỏ lựa chọn đó (T04.9).
  const params = pruneInvalidSelections(parsed, owned.lines, owned.cols);
  // Đổi tham số thì hiện khung chờ (skeleton) trong lúc tải danh sách mới.
  // Mở/đóng popup (?sp=) không làm tải lại danh sách nên không đưa `sp` vào khóa.
  // "Xem thêm" (`n`) cũng không đưa vào khóa: giữ danh sách cũ trên màn hình trong lúc tải thêm,
  // nếu không khung chờ làm trang ngắn lại và trình duyệt kéo về đầu trang.
  const key = buildCatalogQuery({ ...params, sp: null, n: undefined });

  return (
    <CatalogNavProvider params={params}>
      <Banner />
      <StoreBar stores={stores} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <section id="san-pham" className="scroll-mt-24 pt-8 md:pt-10" aria-labelledby="sp-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2
              id="sp-heading"
              className="font-display text-navy text-xl font-semibold md:text-2xl"
            >
              Tất cả sản phẩm
            </h2>
            <ViewToggle params={params} />
          </div>
          <div className="mb-5 min-h-24">
            <Suspense fallback={null}>
              <FilterSection params={params} />
            </Suspense>
          </div>
          <Suspense key={`p${key}`} fallback={<ProductGridSkeleton />}>
            <CatalogSection params={params} />
          </Suspense>
        </section>
      </main>
      {params.sp && (
        <Suspense key={params.sp} fallback={<ProductDetailFallback />}>
          <ProductDetailSection sku={params.sp} store={params.store} />
        </Suspense>
      )}
      <BackToTop />
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </CatalogNavProvider>
  );
}
