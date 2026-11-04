import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import { PhotoSwitch } from "@/components/catalog/photo-switch";
import { parseCatalogParams } from "@/lib/catalog-params";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const html = (raw: Record<string, string>) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams(raw),
      children: createElement(PhotoSwitch),
    }),
  );

describe("công tắc Chỉ xem hình", () => {
  it("tắt: switch aria-checked=false, nhãn Ẩn số lượng", () => {
    const out = html({});
    expect(out).toContain('role="switch"');
    expect(out).toContain('aria-checked="false"');
    expect(out).toContain('aria-label="Chỉ xem hình"');
    expect(out).toContain("Ẩn số lượng");
  });
  it("bật (?xem=hinh): aria-checked=true, nhãn Chỉ xem hình", () => {
    const out = html({ xem: "hinh" });
    expect(out).toContain('aria-checked="true"');
    expect(out).not.toContain("Ẩn số lượng");
  });
  it("gợi ý lần đầu chưa hiện khi render máy chủ (tránh lệch hydrate), vẫn có sẵn cho rê chuột", () => {
    const out = html({});
    expect(out).toContain('data-testid="photo-hint"');
    expect(out).toMatch(/data-testid="photo-hint"[^>]*class="[^"]*\bhidden\b/);
  });
});
