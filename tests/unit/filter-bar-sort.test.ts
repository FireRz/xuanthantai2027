import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { SORT_LABELS } from "@/components/catalog/catalog-toolbar";
import { FilterBar } from "@/components/catalog/filter-bar";
import { parseCatalogParams } from "@/lib/catalog-params";
import type { FacetCounts } from "@/server/services/catalog-facets";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const facets: FacetCounts = {
  brand: [{ id: "b1", name: "Nhãn A", count: 3 }],
  line: [],
  col: [],
  mat: [],
  typ: [],
  pr: [],
  store: [],
  total: 3,
  typTotal: 3,
  scope: "total",
};

const html = (showSort?: boolean) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams({}),
      path: "/phan-tich",
      children: createElement(FilterBar, { facets, showSort }),
    }),
  );

describe("FilterBar — sắp xếp", () => {
  it("mặc định bảng lọc điện thoại có mục Sắp xếp", () => {
    const out = html();
    expect(out).toContain("Sắp xếp");
    expect(out).toContain(SORT_LABELS.sku);
  });

  it("showSort={false}: không có chữ Sắp xếp và không có chip sắp xếp", () => {
    const out = html(false);
    expect(out).not.toContain("Sắp xếp");
    for (const label of Object.values(SORT_LABELS)) expect(out).not.toContain(label);
  });
});
