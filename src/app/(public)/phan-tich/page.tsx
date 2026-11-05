import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { analyticsHref, GroupDimPicker } from "@/components/analytics/group-dim-picker";
import { GroupTable } from "@/components/analytics/group-table";
import { StatusBar } from "@/components/analytics/status-bar";
import { SummaryTiles } from "@/components/analytics/summary-tiles";
import { TopList } from "@/components/analytics/top-list";
import { ViewerPasswordForm } from "@/components/analytics/viewer-password-form";
import { BackToTop } from "@/components/catalog/back-to-top";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { AllProductsSwitch } from "@/components/catalog/catalog-toolbar";
import { FilterBar } from "@/components/catalog/filter-bar";
import { Logo } from "@/components/catalog/logo";
import {
  ProductDetailFallback,
  ProductDetailSection,
} from "@/components/catalog/product-detail-section";
import { SiteFooter } from "@/components/catalog/site-footer";
import { StoreBar } from "@/components/catalog/store-bar";
import { GROUP_DIM_LABELS, parseGroupDim } from "@/lib/analytics-params";
import {
  PAGE_SIZE,
  parseCatalogParams,
  pruneInvalidSelections,
  type CatalogParams,
  type RawSearchParams,
} from "@/lib/catalog-params";
import { hasViewerAccess, isViewerPasswordSet } from "@/server/auth/viewer-pass";
import { regionLabel } from "@/lib/region";
import { prisma } from "@/server/db";
import {
  getAnalyticsSummary,
  getGroupBreakdown,
  getTopProducts,
} from "@/server/services/analytics";
import { getFacetCounts, listOwnedOptions } from "@/server/services/catalog";

// Số liệu luôn mới sau mỗi lần nhập Excel; quyền xem đọc từ cookie ở mỗi lần xem.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Phân tích" };

/** Chuỗi truy vấn hiện tại (để form mật khẩu đưa người xem về đúng bộ lọc). */
function currentQuery(raw: RawSearchParams): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) u.append(k, x);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  if (!(await hasViewerAccess())) {
    const open = await isViewerPasswordSet();
    return (
      <GateCard>
        {open ? (
          <ViewerPasswordForm next={currentQuery(raw)} />
        ) : (
          <div data-testid="analytics-closed" className="space-y-2 text-center">
            <h2 className="font-display text-navy text-xl font-semibold">
              Trang phân tích chưa mở
            </h2>
            <p className="text-ink-muted text-sm">Quản trị viên chưa đặt mật khẩu xem.</p>
          </div>
        )}
      </GateCard>
    );
  }

  const dim = parseGroupDim(raw.nhom);
  // Chỉ dùng bộ lọc và phạm vi cửa hàng của danh mục; sắp xếp, kiểu xem, số SP, chế độ hình
  // không có nghĩa ở đây (popup SP sắp trước/sau theo Mã A→Z và luôn hiện số).
  const parsed: CatalogParams = {
    ...parseCatalogParams(raw),
    sort: "sku",
    view: "grid",
    n: PAGE_SIZE,
    photo: false,
  };
  const [owned, stores] = await Promise.all([
    listOwnedOptions(),
    prisma.store.findMany({
      where: { active: true },
      select: { code: true, name: true, region: true },
      orderBy: { code: "asc" },
    }),
  ]);
  const params = pruneInvalidSelections(parsed, owned.lines, owned.cols);
  const [facets, summary, groups, topSold, topShortage] = await Promise.all([
    getFacetCounts(params),
    getAnalyticsSummary(params),
    getGroupBreakdown(params, dim),
    getTopProducts(params, "sold", 10),
    getTopProducts(params, "shortage", 10),
  ]);
  // Công tắc "Xem tất cả SP" chỉ có nghĩa khi cửa hàng đang chọn có thật và đang hiện.
  const code = params.store?.toLowerCase();
  const storeFacet = code ? facets.store.find((s) => s.id.toLowerCase() === code) : undefined;
  const region = facets.scope === "region" ? params.kv : null;
  // Công tắc + nhãn phạm vi: cửa hàng hoặc khu vực đang chọn có thật và đang hiện.
  const scopeStore = facets.scope !== "total";
  const suffix = params.all ? " · tất cả SP" : " · SP có đặt";
  const scope = storeFacet
    ? `Cửa hàng ${storeFacet.id}${suffix}`
    : region
      ? `${regionLabel(region)}${suffix}`
      : "Tất cả cửa hàng";

  return (
    <CatalogNavProvider
      params={params}
      path="/phan-tich"
      keep={dim === "brand" ? "" : `nhom=${dim}`}
    >
      <AnalyticsHeader />
      <StoreBar stores={stores} showPhotoSwitch={false} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <section id="san-pham" className="scroll-mt-24 pt-6 md:pt-8" aria-label="Bộ lọc">
          <div className="mb-6">
            <FilterBar
              facets={facets}
              showSort={false}
              toolbar={
                scopeStore ? (
                  <div className="hidden md:block">
                    <AllProductsSwitch />
                  </div>
                ) : undefined
              }
              sheetExtra={
                scopeStore ? (
                  <div className="border-line border-b pb-3">
                    <AllProductsSwitch />
                  </div>
                ) : null
              }
            />
          </div>
        </section>

        <div id="ket-qua" className="scroll-mt-24 space-y-8 md:space-y-10">
          {summary.products === 0 ? (
            <div
              data-testid="analytics-empty"
              className="border-line rounded-xl border bg-white px-4 py-12 text-center"
            >
              <p className="font-display text-navy text-xl font-semibold">
                Không có sản phẩm phù hợp
              </p>
              <Link
                href={analyticsHref(parseCatalogParams({}), dim)}
                scroll={false}
                prefetch={false}
                data-testid="analytics-clear"
                className="border-brand text-brand focus-visible:outline-brand mt-4 inline-flex min-h-11 items-center rounded-full border-2 bg-white px-5 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Xóa lọc
              </Link>
            </div>
          ) : (
            <>
              <Block id="so-tong" title="Số tổng" note={scope}>
                <SummaryTiles summary={summary} />
              </Block>
              <Block id="trang-thai" title="Mã theo trạng thái">
                <StatusBar status={summary.status} soldOut={summary.soldOut} />
              </Block>
              <Block
                id="so-sanh"
                title="So sánh theo nhóm"
                note={`Theo ${GROUP_DIM_LABELS[dim].toLowerCase()}`}
              >
                <div className="space-y-3">
                  <GroupDimPicker params={params} dim={dim} />
                  <GroupTable rows={groups} total={summary} dim={dim} />
                </div>
              </Block>
              <Block id="top-10" title="Top 10">
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  <TopList kind="sold" items={topSold} />
                  <TopList kind="shortage" items={topShortage} />
                </div>
              </Block>
            </>
          )}
        </div>
      </main>
      {params.sp && (
        <Suspense key="sp" fallback={<ProductDetailFallback />}>
          <ProductDetailSection sku={params.sp} params={params} />
        </Suspense>
      )}
      <BackToTop />
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </CatalogNavProvider>
  );
}

function Block({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="font-display text-navy text-xl font-semibold md:text-2xl">
          {title}
        </h2>
        {note && <p className="text-ink-muted text-sm">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Đầu trang gọn (không banner): logo, tên trang và đường về danh mục. */
function AnalyticsHeader() {
  return (
    <header className="bg-brand-dark text-festive-text">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 md:py-4">
        <Logo />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl leading-tight font-bold text-white md:text-2xl">
            Phân tích
          </h1>
          <p className="hidden truncate text-sm sm:block">
            Xuân Thần Tài 2027 · số tổng theo bộ lọc
          </p>
        </div>
        <Link
          href="/"
          className="focus-visible:outline-gold inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Danh mục
        </Link>
      </div>
    </header>
  );
}

/** Khung giữa màn hình cho cổng mật khẩu, cùng kiểu thẻ nhỏ như trang đăng nhập. */
function GateCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="border-line w-full max-w-sm overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="bg-brand-dark flex items-center gap-3 px-6 py-4">
          <Logo />
          <div>
            <h1 className="font-display text-lg leading-tight font-bold text-white">Phân tích</h1>
            <p className="text-festive-text text-sm">Xuân Thần Tài 2027</p>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </main>
  );
}
