import type { CatalogParams } from "@/lib/catalog-params";
import { getFacetCounts } from "@/server/services/catalog";
import { CatalogToolbar } from "./catalog-toolbar";
import { FilterBar } from "./filter-bar";

/** Đếm số SP cho từng lựa chọn (máy chủ) rồi dựng thanh lọc + sắp xếp + công tắc. */
export async function FilterSection({ params }: { params: CatalogParams }) {
  const facets = await getFacetCounts(params);
  // Công tắc chỉ có nghĩa khi cửa hàng đang chọn có thật và đang hiện.
  const code = params.store?.toLowerCase();
  const storeSelected = Boolean(code && facets.store.some((s) => s.id.toLowerCase() === code));
  return <FilterBar facets={facets} toolbar={<CatalogToolbar storeSelected={storeSelected} />} />;
}
