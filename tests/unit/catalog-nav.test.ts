import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider, useCatalogNav } from "@/components/catalog/catalog-nav";
import { ProductLink } from "@/components/catalog/product-link";
import { parseCatalogParams } from "@/lib/catalog-params";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

type ProviderProps = { path?: string; keep?: string };

const linkHtml = (params: Record<string, string>, extra: ProviderProps = {}) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams(params),
      ...extra,
      children: createElement(ProductLink, { sku: "NTT001" }, "x"),
    }),
  );

function Probe() {
  const { hrefFor, state } = useCatalogNav();
  return createElement("span", null, hrefFor(state));
}

const probeHtml = (extra: ProviderProps) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams({}),
      ...extra,
      children: createElement(Probe),
    }),
  );

describe("CatalogNavProvider — đường dẫn trang", () => {
  it("mặc định path / — link SP như cũ", () => {
    expect(linkHtml({ sort: "price_asc" })).toContain('href="/?sort=price_asc&amp;sp=NTT001"');
  });

  it("path /phan-tich + keep nhom=line — link SP ở lại trang và giữ nhom", () => {
    expect(linkHtml({}, { path: "/phan-tich", keep: "nhom=line" })).toContain(
      'href="/phan-tich?sp=NTT001&amp;nhom=line"',
    );
  });

  it("hrefFor không tham số → path + keep", () => {
    expect(probeHtml({ path: "/phan-tich", keep: "nhom=line" })).toContain(
      ">/phan-tich?nhom=line<",
    );
    expect(probeHtml({ path: "/", keep: "" })).toContain(">/<");
  });
});
