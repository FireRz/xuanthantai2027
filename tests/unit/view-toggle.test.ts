import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoModeToggle } from "@/components/catalog/view-toggle";
import { parseCatalogParams } from "@/lib/catalog-params";

const html = (raw: Record<string, string>) =>
  renderToStaticMarkup(createElement(PhotoModeToggle, { params: parseCatalogParams(raw) }));

describe("công tắc Chỉ xem hình", () => {
  it("tắt → link bật xem=hinh, giữ lọc", () => {
    const out = html({ sort: "price_asc", q: "NTT" });
    expect(out).toContain("xem=hinh");
    expect(out).toContain("sort=price_asc");
    expect(out).toContain("q=NTT");
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain("Chỉ xem hình");
  });
  it("bật → link bỏ xem=hinh, giữ lọc", () => {
    const out = html({ xem: "hinh", view: "list" });
    expect(out).not.toContain("xem=");
    expect(out).toContain("view=list");
    expect(out).toContain('aria-pressed="true"');
  });
});
