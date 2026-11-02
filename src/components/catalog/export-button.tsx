import { Download, Ellipsis } from "lucide-react";
import { buildCatalogQuery, PAGE_SIZE, type CatalogParams } from "@/lib/catalog-params";

/**
 * Nút "Xuất Excel" (F11, UI-DESIGN §5.1/5.2): máy tính là nút riêng cạnh Lưới/Bảng, điện thoại nằm
 * trong menu ⋯. Liên kết mang đúng tham số lọc/tìm/sắp xếp/cửa hàng/công tắc đang xem
 * (bỏ tham số chỉ để hiển thị: kiểu xem, số SP đang tải, SP đang mở).
 */
export function ExportButton({ params }: { params: CatalogParams }) {
  const href = `/api/export${buildCatalogQuery({ ...params, sp: null, n: PAGE_SIZE, view: "grid" })}`;
  const item = "min-h-11 items-center gap-2 whitespace-nowrap font-medium md:min-h-10";
  return (
    <>
      <a
        href={href}
        download
        data-testid="export-button"
        className={`${item} border-line hover:border-gold hidden rounded-full border bg-white px-4 text-[15px] md:inline-flex`}
      >
        <Download className="size-4" aria-hidden />
        Xuất Excel
      </a>
      <details className="relative md:hidden" data-testid="export-menu">
        <summary
          aria-label="Thêm"
          className="border-line flex size-11 cursor-pointer list-none items-center justify-center rounded-full border bg-white [&::-webkit-details-marker]:hidden"
        >
          <Ellipsis className="size-5" aria-hidden />
        </summary>
        <div className="border-line absolute right-0 z-20 mt-2 rounded-xl border bg-white p-1 shadow-lg">
          <a
            href={href}
            download
            data-testid="export-button-mobile"
            className={`${item} hover:bg-gold-soft inline-flex rounded-lg px-4`}
          >
            <Download className="size-4" aria-hidden />
            Xuất Excel
          </a>
        </div>
      </details>
    </>
  );
}
