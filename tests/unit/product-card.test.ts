import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { ProductCard } from "@/components/catalog/product-card";
import { parseCatalogParams } from "@/lib/catalog-params";
import { formatDateTime, formatInt, formatPercent, formatVnd } from "@/lib/format";
import { computeMetrics } from "@/lib/metrics";
import type { ProductListItem } from "@/server/services/catalog";

const item = (over: Partial<ProductListItem> = {}): ProductListItem => ({
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
  ...over,
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const html = (i: ProductListItem) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams({ sort: "price_asc" }),
      children: createElement(ProductCard, { item: i }),
    }),
  );

describe("T05.3 — thẻ mở popup", () => {
  it("liên kết tới ?sp=MÃ và giữ tham số lọc đang xem", () => {
    expect(html(item())).toContain('href="/?sort=price_asc&amp;sp=NTT001"');
  });
});

describe("định dạng số", () => {
  it("giá 12500000 → 12.500.000 ₫; thiếu → —", () => {
    expect(formatVnd(12_500_000)).toBe("12.500.000 ₫");
    expect(formatVnd(0)).toBe("0 ₫");
    expect(formatVnd(null)).toBe("—");
  });
  it("số nguyên có dấu chấm nghìn", () => {
    expect(formatInt(1234)).toBe("1.234");
    expect(formatInt(12)).toBe("12");
  });
  it("tỷ lệ: 75%, 99,6%, null → —; chưa đủ không hiện 100%", () => {
    expect(formatPercent(0.75)).toBe("75%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.996)).toBe("99,6%");
    expect(formatPercent(0.9996)).toBe("99,9%");
    expect(formatPercent(0.3333)).toBe("33,3%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("T03.14 — formatDateTime", () => {
  it("theo giờ Việt Nam (UTC+7)", () => {
    expect(formatDateTime(new Date("2026-11-02T07:05:00Z"))).toBe("14:05 02/11/2026");
    expect(formatDateTime(new Date("2026-12-31T17:30:00Z"))).toBe("00:30 01/01/2027");
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("T03.2 — ProductCard", () => {
  it("đủ trường: mã, tuổi vàng, tên, giá, Về X/Y, thiếu, trạng thái, ảnh thumbnail lười", () => {
    const out = html(item());
    expect(out).toContain("NTT001 · Vàng 18K");
    expect(out).toContain("Nhẫn Kim Tiền");
    expect(out).toContain("12.500.000 ₫");
    expect(out).toContain("90/120");
    expect(out).toContain("(75%)");
    expect(out).toContain("Còn thiếu 30");
    expect(out).toContain('data-status="short"');
    expect(out).toContain('src="https://blob.example/NTT001-thumb.webp"');
    expect(out).toContain('loading="lazy"');
    expect(out).not.toContain("NTT001.webp"); // không bao giờ dùng ảnh lớn ở danh mục
  });

  it("thiếu dữ liệu hiển thị — và ảnh thay thế; Đặt = 0 → tỷ lệ — và không có 'Còn thiếu'", () => {
    const out = html(
      item({
        name: null,
        priceVnd: null,
        materialName: null,
        thumbUrl: null,
        imageUrl: null,
        metrics: computeMetrics(0, 0),
      }),
    );
    expect(out).toContain("NTT001 · —");
    expect(out).toContain(">—</h3>");
    expect(out).toContain("(—)");
    expect(out).toContain("data-placeholder");
    expect(out).toContain('data-status="noorder"');
    expect(out).not.toContain("Còn thiếu");
  });

  it("đủ hàng: không hiện 'Còn thiếu N'", () => {
    const out = html(item({ metrics: computeMetrics(5, 7) }));
    expect(out).toContain('data-status="full"');
    expect(out).toContain("7/5");
    expect(out).not.toContain("Còn thiếu ");
  });
});
