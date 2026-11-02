import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SetupGuide } from "@/app/(admin)/admin/master-data/setup-guide";
import { getSetupSteps, isSetupComplete, type MasterDataCounts } from "@/lib/setup-guide";

const empty: MasterDataCounts = { stores: 0, brands: 0, lines: 0, collections: 0, materials: 0 };
const html = (c: MasterDataCounts) =>
  renderToStaticMarkup(createElement(SetupGuide, { counts: c }));

describe("T06.6 — hướng dẫn thứ tự nhập", () => {
  it("thứ tự: cửa hàng → nhãn → dòng → BST → chất liệu → mẫu Excel", () => {
    expect(getSetupSteps(empty).map((s) => s.key)).toEqual([
      "stores",
      "brands",
      "lines",
      "collections",
      "materials",
      "excel",
    ]);
  });

  it("CSDL trống → hiện hướng dẫn mở sẵn, chưa bước nào xong", () => {
    const out = html(empty);
    expect(out).toContain("Hướng dẫn thứ tự nhập");
    expect(out).toContain("Hệ thống chưa có danh mục nào");
    expect(out).toContain("<details");
    expect(out).toMatch(/<details[^>]*\sopen=""/);
    expect(out).toContain("Tải file mẫu Excel");
    expect(out).not.toContain("đã xong");
    expect(isSetupComplete(empty)).toBe(false);
  });

  it("BST và chất liệu không bắt buộc: đủ cửa hàng + nhãn + dòng là coi như sẵn sàng", () => {
    const ready = { ...empty, stores: 2, brands: 1, lines: 3 };
    expect(isSetupComplete(ready)).toBe(true);
    const out = html(ready);
    expect(out).not.toMatch(/<details[^>]*\sopen=""/);
    expect(out).toContain("không bắt buộc");
  });

  it("thiếu dòng (đã có nhãn + cửa hàng) → vẫn chưa sẵn sàng, bước nhãn đánh dấu xong", () => {
    const c = { ...empty, stores: 1, brands: 1 };
    expect(isSetupComplete(c)).toBe(false);
    const steps = getSetupSteps(c);
    expect(steps.find((s) => s.key === "brands")?.done).toBe(true);
    expect(steps.find((s) => s.key === "lines")?.done).toBe(false);
  });
});
