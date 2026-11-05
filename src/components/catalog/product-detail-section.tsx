import { getProductDetail } from "@/server/services/product-detail";
import { getProductNeighbors } from "@/server/services/product-neighbors";
import type { CatalogParams } from "@/lib/catalog-params";
import { ProductDialog } from "./product-dialog";
import { ProductViewer } from "./product-viewer";

/**
 * Popup chi tiết SP theo `?sp=` (F05). Mã không có / SP bị ẩn → thông báo "Không tìm thấy sản phẩm" (T05.6).
 * Kèm SP trước/sau theo danh sách đang xem để vuốt / bấm mũi tên / phím ←→ chuyển SP (ProductViewer).
 */
export async function ProductDetailSection({
  sku,
  params,
}: {
  sku: string;
  params: CatalogParams;
}) {
  const [detail, neighbors] = await Promise.all([
    getProductDetail(sku, params.store, params.kv),
    getProductNeighbors(params, sku),
  ]);
  if (!detail) {
    return (
      <ProductDialog title="Không tìm thấy sản phẩm">
        <p data-testid="product-not-found" className="px-4 py-8 text-center md:px-6">
          Sản phẩm <b className="uppercase">{sku}</b> không tồn tại hoặc hiện không được hiển thị.
        </p>
      </ProductDialog>
    );
  }
  // Lần mở đầu dựng trên máy chủ; chuyển SP trước/sau sau đó do ProductViewer tải trên trình duyệt.
  return <ProductViewer initial={{ detail, neighbors }} />;
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
