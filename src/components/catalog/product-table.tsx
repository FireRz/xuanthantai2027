import { formatInt, formatPercent, formatVnd, orDash } from "@/lib/format";
import { stockStatus } from "@/lib/status";
import type { ProductListItem } from "@/server/services/catalog";
import { ProductImage } from "./product-image";
import { ClickableRow, ProductLink } from "./product-link";
import { StatusBadge } from "./status-badge";

// Điện thoại ẩn Nhãn / Dòng / BST / Tuổi vàng (UI-DESIGN §5.4).
const HIDE_ON_PHONE = "hidden md:table-cell";

const th =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-ink-muted bg-gold-soft";
const num = "text-right tabular-nums";

/**
 * Dạng Bảng: đủ cột trên máy tính (tiêu đề dính khi cuộn); điện thoại cuộn ngang trong khung bảng,
 * không cuộn ngang cả trang.
 */
export function ProductTable({ items }: { items: ProductListItem[] }) {
  return (
    <div
      data-testid="product-table"
      className="border-line overflow-x-auto rounded-xl border bg-white lg:overflow-visible"
    >
      <table className="w-full min-w-[760px] border-collapse text-[14px] md:text-[15px] lg:min-w-0">
        <thead>
          <tr>
            <th scope="col" className={`${th} w-16 rounded-tl-xl`}>
              Ảnh
            </th>
            <th scope="col" className={th}>
              Mã SP
            </th>
            <th scope="col" className={th}>
              Tên
            </th>
            <th scope="col" className={`${th} ${HIDE_ON_PHONE}`}>
              Nhãn
            </th>
            <th scope="col" className={`${th} ${HIDE_ON_PHONE}`}>
              Dòng
            </th>
            <th scope="col" className={`${th} ${HIDE_ON_PHONE}`}>
              BST
            </th>
            <th scope="col" className={`${th} ${HIDE_ON_PHONE}`}>
              Tuổi vàng
            </th>
            <th scope="col" className={`${th} ${num}`}>
              Giá
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
            <th scope="col" className={`${th} rounded-tr-xl`}>
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const m = item.metrics;
            return (
              <ClickableRow
                key={item.id}
                sku={item.sku}
                className="border-line hover:bg-gold-soft/60 cursor-pointer border-t"
              >
                <td className="px-3 py-2">
                  <ProductImage
                    thumbUrl={item.thumbUrl}
                    alt={item.name ?? item.sku}
                    className="border-line size-12 rounded-md border text-xs"
                  />
                </td>
                <td className="px-3 py-2 font-medium tracking-wide whitespace-nowrap uppercase">
                  <ProductLink sku={item.sku} className="hover:underline">
                    {item.sku}
                  </ProductLink>
                </td>
                <td className="min-w-40 px-3 py-2 font-semibold">{orDash(item.name)}</td>
                <td className={`px-3 py-2 ${HIDE_ON_PHONE}`}>{item.brandName}</td>
                <td className={`px-3 py-2 ${HIDE_ON_PHONE}`}>{item.lineName}</td>
                <td className={`px-3 py-2 ${HIDE_ON_PHONE}`}>{orDash(item.collectionName)}</td>
                <td className={`px-3 py-2 whitespace-nowrap ${HIDE_ON_PHONE}`}>
                  {orDash(item.materialName)}
                </td>
                <td className={`px-3 py-2 whitespace-nowrap ${num}`}>{formatVnd(item.priceVnd)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatInt(m.ordered)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatInt(m.received)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatInt(m.shortage)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatPercent(m.rate)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatInt(item.sold)}</td>
                <td className={`px-3 py-2 ${num}`}>{formatInt(item.stock)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={stockStatus(m)} />
                </td>
              </ClickableRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
