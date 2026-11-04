import { formatInt, formatPercent, formatVnd, orDash } from "@/lib/format";
import { sellThrough } from "@/lib/metrics";
import { stockStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { getProductDetail, type ProductDetail } from "@/server/services/product-detail";
import type { CatalogParams } from "@/lib/catalog-params";
import { ProductDialog } from "./product-dialog";
import { ProductImage } from "./product-image";
import { StatusBadge } from "./status-badge";

/** Popup chi tiết SP theo `?sp=` (F05). Mã không có / SP bị ẩn → thông báo "Không tìm thấy sản phẩm" (T05.6). */
export async function ProductDetailSection({
  sku,
  params,
}: {
  sku: string;
  params: CatalogParams;
}) {
  const detail = await getProductDetail(sku, params.store);
  if (!detail) {
    return (
      <ProductDialog title="Không tìm thấy sản phẩm">
        <p data-testid="product-not-found" className="px-4 py-8 text-center md:px-6">
          Sản phẩm <b className="uppercase">{sku}</b> không tồn tại hoặc hiện không được hiển thị.
        </p>
      </ProductDialog>
    );
  }
  return (
    <ProductDialog title={detail.name ?? detail.sku}>
      <DetailBody detail={detail} filterStore={params.store} photo={params.photo} />
    </ProductDialog>
  );
}

export function ProductDetailFallback() {
  return (
    <ProductDialog title="Đang tải…">
      <div
        role="status"
        className="grid gap-4 p-4 md:grid-cols-[300px_1fr] md:gap-6 md:px-6 md:py-5"
      >
        <div className="shimmer bg-gold-soft aspect-square w-full rounded-xl" />
        <div className="space-y-3">
          <div className="shimmer bg-line h-4 w-1/3 rounded" />
          <div className="shimmer bg-line h-4 w-4/5 rounded" />
          <div className="shimmer bg-line h-7 w-1/2 rounded" />
          <div className="shimmer bg-gold-soft h-24 rounded-xl" />
        </div>
        <span className="sr-only">Đang tải sản phẩm…</span>
      </div>
    </ProductDialog>
  );
}

const th = "bg-gold-soft text-ink-muted sticky top-0 px-3 py-2 text-xs font-semibold";
const num = "text-right tabular-nums";
const totalCell = "border-ink sticky bottom-0 border-t-2 bg-white px-3 py-2";

/** Tồn = 0 trong khi hàng đã về: cần chú ý (hết hàng). */
const soldOut = (stock: number, received: number) => stock === 0 && received > 0;

function DetailBody({
  detail: d,
  filterStore,
  photo,
}: {
  detail: ProductDetail;
  filterStore: string | null;
  photo: boolean;
}) {
  const t = d.total;
  const classification = [d.brandName, d.lineName, d.collectionName ?? "Không thuộc BST"].join(
    " · ",
  );
  const filtered = filterStore?.toUpperCase() ?? null;
  // Tóm tắt: số của cửa hàng đang lọc, không lọc thì của tất cả cửa hàng.
  const sum = d.scope
    ? { m: d.scope.metrics, sold: d.scope.sold, stock: d.scope.stock }
    : { m: t, sold: d.totalSold, stock: d.totalStock };
  const scopeLabel = d.scope ? `Cửa hàng ${d.scope.code} · ${d.scope.name}` : "Tất cả cửa hàng";
  return (
    // Máy tính: phần trên đứng yên, chỉ bảng cửa hàng cuộn (giữ tiêu đề cột + dòng TỔNG dính).
    // Điện thoại: cả popup cuộn một lần, bảng chỉ cuộn ngang — không còn hai thanh cuộn lồng nhau.
    <div
      data-testid="product-detail"
      data-sku={d.sku}
      data-photo={photo ? "" : undefined}
      className="md:flex md:min-h-0 md:flex-1 md:flex-col"
    >
      <div className="grid shrink-0 gap-4 p-4 md:grid-cols-[300px_1fr] md:gap-6 md:px-6 md:py-5">
        {/* Điện thoại: ảnh tối đa 30% chiều cao màn hình để số liệu hiện ngay màn đầu; chế độ hình thì ảnh là nội dung chính nên không giới hạn. */}
        <ProductImage
          thumbUrl={d.imageUrl ?? d.thumbUrl}
          alt={d.name ?? d.sku}
          priority
          className={cn(
            "border-line mx-auto aspect-square w-full rounded-xl border md:max-w-none",
            !photo && "max-w-[30vh]",
          )}
        />
        <div className="min-w-0">
          <p className="text-ink-muted font-medium tracking-wide uppercase">{d.sku}</p>
          <p className="my-1.5">{classification}</p>
          <p>Tuổi vàng: {orDash(d.materialName)}</p>
          <p>Chủng loại: {orDash(d.productTypeName)}</p>
          <p className="my-2 text-xl font-bold tabular-nums">{formatVnd(d.priceVnd)}</p>
          {!photo && (
            <div
              data-testid="detail-summary"
              className="bg-gold-soft flex flex-col gap-2 rounded-xl px-3.5 py-3 font-medium tabular-nums"
            >
              <p data-testid="detail-scope" className="text-brand text-sm font-semibold">
                {scopeLabel}
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span>
                  Đặt <b>{formatInt(sum.m.ordered)}</b>
                </span>
                <span>
                  Về <b>{formatInt(sum.m.received)}</b>
                </span>
                <span>
                  Thiếu <b>{formatInt(sum.m.shortage)}</b>
                </span>
                <b>{formatPercent(sum.m.rate)}</b>
                <StatusBadge status={stockStatus(sum.m)} />
              </p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Bán <b>{formatInt(sum.sold)}</b>
                </span>
                <span>
                  Tồn{" "}
                  <b className={cn(soldOut(sum.stock, sum.m.received) && "text-status-short-fg")}>
                    {formatInt(sum.stock)}
                  </b>
                </span>
                <span>
                  % Bán <b>{formatPercent(sellThrough(sum.sold, sum.stock))}</b>
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {!photo && (
        <>
          <h3 className="text-ink-muted mx-4 mb-1.5 shrink-0 text-sm font-semibold md:mx-6">
            Tất cả cửa hàng
          </h3>
          <div className="border-line mx-4 mb-4 overflow-x-auto rounded-xl border md:mx-6 md:mb-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
            <table
              data-testid="store-qty-table"
              className="w-full border-collapse text-[13px] md:text-[15px]"
            >
              <caption className="sr-only">Số lượng theo từng cửa hàng</caption>
              <thead>
                <tr>
                  <th scope="col" className={`${th} text-left`}>
                    Cửa hàng
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    Đặt
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    Về
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    Thiếu
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    %
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    Bán
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    Tồn
                  </th>
                  <th scope="col" className={`${th} ${num}`}>
                    % Bán
                  </th>
                  <th scope="col" className={`${th} text-left`}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.stores.map((s) => {
                  const hl = filtered !== null && s.code.toUpperCase() === filtered;
                  return (
                    <tr
                      key={s.code}
                      data-testid="store-qty-row"
                      data-store={s.code}
                      data-highlight={hl ? "true" : undefined}
                      aria-current={hl ? "true" : undefined}
                      className={cn("border-line border-t", hl && "bg-gold-soft font-semibold")}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="font-medium">{s.code}</span> {s.name}
                      </td>
                      <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.ordered)}</td>
                      <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.received)}</td>
                      <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.shortage)}</td>
                      <td className={`px-3 py-2 ${num}`}>{formatPercent(s.metrics.rate)}</td>
                      <td className={`px-3 py-2 ${num}`}>{formatInt(s.sold)}</td>
                      <td
                        className={cn(
                          `px-3 py-2 ${num}`,
                          soldOut(s.stock, s.metrics.received) && "text-status-short-fg font-bold",
                        )}
                      >
                        {formatInt(s.stock)}
                      </td>
                      <td className={`px-3 py-2 ${num}`}>
                        {formatPercent(sellThrough(s.sold, s.stock))}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={stockStatus(s.metrics)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr data-testid="store-qty-total" className="font-bold">
                  <th scope="row" className={`${totalCell} text-left`}>
                    TỔNG
                  </th>
                  <td className={`${totalCell} ${num}`}>{formatInt(t.ordered)}</td>
                  <td className={`${totalCell} ${num}`}>{formatInt(t.received)}</td>
                  <td className={`${totalCell} ${num}`}>{formatInt(t.shortage)}</td>
                  <td className={`${totalCell} ${num}`}>{formatPercent(t.rate)}</td>
                  <td className={`${totalCell} ${num}`}>{formatInt(d.totalSold)}</td>
                  <td className={`${totalCell} ${num}`}>{formatInt(d.totalStock)}</td>
                  <td className={`${totalCell} ${num}`}>
                    {formatPercent(sellThrough(d.totalSold, d.totalStock))}
                  </td>
                  <td className={totalCell}>
                    <StatusBadge status={stockStatus(t)} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
