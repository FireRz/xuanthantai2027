import type { CatalogParams } from "@/lib/catalog-params";
import { getFacetCounts } from "@/server/services/catalog";
import { AllProductsSwitch, CatalogToolbar } from "./catalog-toolbar";
import { FilterBar } from "./filter-bar";

/** Đếm số SP cho từng lựa chọn (máy chủ) rồi dựng thanh lọc + sắp xếp + công tắc. */
export async function FilterSection({ params }: { params: CatalogParams }) {
  const facets = await getFacetCounts(params);
  // Công tắc chỉ có nghĩa khi cửa hàng / khu vực đang chọn có thật và đang hiện.
  const storeSelected = facets.scope !== "total";
  return (
    <FilterBar
      facets={facets}
      toolbar={<CatalogToolbar storeSelected={storeSelected} />}
      sheetExtra={
        storeSelected ? (
          <div className="border-line border-b pb-3">
            <AllProductsSwitch />
          </div>
        ) : null
      }
    />
  );
}
