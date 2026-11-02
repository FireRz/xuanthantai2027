import { formatInt, formatPercent, formatVnd, orDash } from "@/lib/format";
import { stockStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import { getProductDetail, type ProductDetail } from "@/server/services/product-detail";
import { ProductDialog } from "./product-dialog";
import { ProductImage } from "./product-image";
import { StatusBadge } from "./status-badge";

/** Popup chi tiết SP theo `?sp=` (F05). Mã không có / SP bị ẩn → thông báo "Không tìm thấy sản phẩm" (T05.6). */
export async function ProductDetailSection({ sku, store }: { sku: string; store: string | null }) {
  const detail = await getProductDetail(sku);
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
      <DetailBody detail={detail} filterStore={store} />
    </ProductDialog>
  );
}

export function ProductDetailFallback() {
  return (
    <ProductDialog title="Đang tải…">
      <p role="status" className="text-ink-muted px-4 py-8 text-center md:px-6">
        Đang tải sản phẩm…
      </p>
    </ProductDialog>
  );
}

const th = "bg-gold-soft text-ink-muted sticky top-0 px-3 py-2 text-xs font-semibold";
const num = "text-right tabular-nums";
const totalCell = "border-ink sticky bottom-0 border-t-2 bg-white px-3 py-2";

function DetailBody({
  detail: d,
  filterStore,
}: {
  detail: ProductDetail;
  filterStore: string | null;
}) {
  const t = d.total;
  const classification = [d.brandName, d.lineName, d.collectionName ?? "Không thuộc BST"].join(
    " · ",
  );
  const filtered = filterStore?.toUpperCase() ?? null;
  return (
    <div data-testid="product-detail" data-sku={d.sku}>
      <div className="grid gap-4 p-4 md:grid-cols-[300px_1fr] md:gap-6 md:px-6 md:py-5">
        <ProductImage
          thumbUrl={d.imageUrl ?? d.thumbUrl}
          alt={d.name ?? d.sku}
          priority
          className="border-line aspect-square w-full rounded-xl border"
        />
        <div className="min-w-0">
          <p className="text-ink-muted font-medium tracking-wide uppercase">{d.sku}</p>
          <p className="my-1.5">{classification}</p>
          <p>Chất liệu: {orDash(d.materialName)}</p>
          <p className="my-2 text-xl font-bold tabular-nums">{formatVnd(d.priceVnd)}</p>
          <p
            data-testid="detail-summary"
            className="bg-gold-soft flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3.5 py-3 font-medium tabular-nums"
          >
            <span>
              Đặt <b>{formatInt(t.ordered)}</b>
            </span>
            <span>
              Về <b>{formatInt(t.received)}</b>
            </span>
            <span>
              Thiếu <b>{formatInt(t.shortage)}</b>
            </span>
            <b>{formatPercent(t.rate)}</b>
            <StatusBadge status={stockStatus(t)} />
          </p>
        </div>
      </div>

      <div className="border-line mx-4 mb-4 max-h-[min(50vh,28rem)] overflow-auto rounded-xl border md:mx-6 md:mb-6">
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
              <th scope="col" className={`${th} text-left`}>
                TT
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
                  <td className="px-3 py-2">
                    <span className="font-medium">{s.code}</span> {s.name}
                  </td>
                  <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.ordered)}</td>
                  <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.received)}</td>
                  <td className={`px-3 py-2 ${num}`}>{formatInt(s.metrics.shortage)}</td>
                  <td className={`px-3 py-2 ${num}`}>{formatPercent(s.metrics.rate)}</td>
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
              <td className={totalCell}>
                <StatusBadge status={stockStatus(t)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
