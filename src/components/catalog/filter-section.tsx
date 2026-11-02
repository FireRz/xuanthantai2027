import type { CatalogParams } from "@/lib/catalog-params";
import { getFacetCounts } from "@/server/services/catalog";
import { FilterBar } from "./filter-bar";

/** Đếm số SP cho từng lựa chọn (máy chủ) rồi dựng thanh lọc. */
export async function FilterSection({ params }: { params: CatalogParams }) {
  const facets = await getFacetCounts(params);
  return <FilterBar facets={facets} />;
}
