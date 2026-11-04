import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { ProductTable } from "@/components/catalog/product-table";
import { parseCatalogParams } from "@/lib/catalog-params";
import { computeMetrics } from "@/lib/metrics";
import type { ProductListItem } from "@/server/services/catalog";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const item: ProductListItem = {
  id: "1",
  sku: "NTT001",
  name: "Nhẫn Kim Tiền",
  priceVnd: 12_500_000,
  imageUrl: "https://blob.example/NTT001.webp",
  thumbUrl: "https://blob.example/NTT001-thumb.webp",
  brandName: "Nhãn A",
  lineName: "Nhẫn",
  collectionName: "Phúc Lộc",
  materialName: "Vàng 18K",
  metrics: computeMetrics(120, 90),
  sold: 5,
  stock: 3,
};

const html = (photo: boolean) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams({}),
      children: createElement(ProductTable, { items: [item], photo }),
    }),
  );

describe("ProductTable", () => {
  it("chế độ hình: chỉ cột Ảnh→Giá", () => {
    const out = html(true);
    expect(out).toContain("Giá");
    expect(out).toContain("NTT001");
    expect(out).not.toContain(">Đặt<");
    expect(out).not.toContain(">Về<");
    expect(out).not.toContain(">Thiếu<");
    expect(out).not.toContain(">Bán<");
    expect(out).not.toContain(">Tồn<");
    expect(out).not.toContain("Trạng thái");
    expect(out).not.toContain("data-status=");
    expect(out).not.toContain("min-w-[820px]");
  });

  it("chế độ đầy đủ giữ cột Trạng thái", () => {
    const out = html(false);
    expect(out).toContain("Trạng thái");
    expect(out).toContain(">Đặt<");
    expect(out).toContain(">Tồn<");
    expect(out).toContain("data-status=");
  });
});
