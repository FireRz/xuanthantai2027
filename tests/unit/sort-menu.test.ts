import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { SortMenu } from "@/components/catalog/catalog-toolbar";
import { parseCatalogParams } from "@/lib/catalog-params";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const html = (raw: Record<string, string>) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams(raw),
      children: createElement(SortMenu),
    }),
  );

describe("menu sắp xếp", () => {
  it("chế độ hình: ẩn 'Còn thiếu' và 'Bán chạy', còn lại giữ", () => {
    const out = html({ xem: "hinh" });
    expect(out).not.toContain('value="shortage"');
    expect(out).not.toContain('value="sold"');
    expect(out).toContain('value="price_desc"');
    expect(out.match(/<option/g)).toHaveLength(4);
  });
  it("chế độ đầy đủ: đủ 6 kiểu", () => {
    expect(html({}).match(/<option/g)).toHaveLength(6);
  });
});
