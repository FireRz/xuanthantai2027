import { Suspense } from "react";
import { Banner } from "@/components/catalog/banner";
import { CatalogSection } from "@/components/catalog/catalog-section";
import { FilterSection } from "@/components/catalog/filter-section";
import { CollectionsSection } from "@/components/catalog/collections-section";
import { ProductGridSkeleton } from "@/components/catalog/product-grid";
import { SiteFooter } from "@/components/catalog/site-footer";
import { StoreBar } from "@/components/catalog/store-bar";
import { buildCatalogQuery, parseCatalogParams, type RawSearchParams } from "@/lib/catalog-params";
import { prisma } from "@/server/db";

// Danh mục đọc dữ liệu mới nhất ở mỗi lần xem (SL thay đổi sau mỗi lần nhập).
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = parseCatalogParams(await searchParams);
  const stores = await prisma.store.findMany({
    where: { active: true },
    select: { code: true, name: true },
    orderBy: { code: "asc" },
  });
  // Đổi tham số thì hiện khung chờ (skeleton) trong lúc tải danh sách mới.
  const key = buildCatalogQuery(params);

  return (
    <>
      <Banner />
      <StoreBar stores={stores} params={params} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Suspense key={`c${key}`} fallback={null}>
          <CollectionsSection params={params} />
        </Suspense>
        <section id="san-pham" className="scroll-mt-24 pt-8 md:pt-10" aria-labelledby="sp-heading">
          <h2 id="sp-heading" className="font-display mb-4 text-xl font-semibold md:text-2xl">
            Tất cả sản phẩm
          </h2>
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
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </>
  );
}
