import { describe, expect, it } from "vitest";
import { buildCatalogQuery, PAGE_SIZE, parseCatalogParams } from "@/lib/catalog-params";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("parseCatalogParams", () => {
  it("không có tham số → mặc định: Lưới, Mã A→Z, tổng hệ thống", () => {
    expect(parseCatalogParams({})).toEqual({
      brand: [],
      line: [],
      col: [],
      mat: [],
      store: null,
      all: false,
      q: "",
      sort: "sku",
      view: "grid",
      sp: null,
      n: PAGE_SIZE,
    });
  });

  it("đọc danh sách, bỏ trùng và id không hợp lệ", () => {
    const p = parseCatalogParams({ col: `${ID},none,rác,${ID}`, brand: "xyz" });
    expect(p.col).toEqual([ID, "none"]);
    expect(p.brand).toEqual([]);
  });

  it("giá trị lạ của sort/view rơi về mặc định; view=list được giữ", () => {
    expect(parseCatalogParams({ sort: "bậy", view: "x" })).toMatchObject({
      sort: "sku",
      view: "grid",
    });
    expect(parseCatalogParams({ sort: "shortage", view: "list" })).toMatchObject({
      sort: "shortage",
      view: "list",
    });
  });

  it("cửa hàng, tìm kiếm, sp, all", () => {
    const p = parseCatalogParams({ store: " CH001 ", q: "  ttg0 ", sp: "TTG0001", all: "1" });
    expect(p).toMatchObject({ store: "CH001", q: "ttg0", sp: "TTG0001", all: true });
  });

  it("n không hợp lệ hoặc nhỏ hơn một trang → một trang", () => {
    expect(parseCatalogParams({ n: "abc" }).n).toBe(PAGE_SIZE);
    expect(parseCatalogParams({ n: "5" }).n).toBe(PAGE_SIZE);
    expect(parseCatalogParams({ n: "72" }).n).toBe(72);
    expect(parseCatalogParams({ n: "999999" }).n).toBe(3000);
  });
});

describe("buildCatalogQuery", () => {
  it("bỏ giá trị mặc định", () => {
    expect(buildCatalogQuery(parseCatalogParams({}))).toBe("");
  });
  it("quay vòng parse → build → parse không đổi", () => {
    const p = parseCatalogParams({
      col: `${ID},none`,
      store: "CH001",
      all: "1",
      q: "a",
      view: "list",
      n: "48",
    });
    expect(
      parseCatalogParams(Object.fromEntries(new URLSearchParams(buildCatalogQuery(p)))),
    ).toEqual(p);
  });
  it("all chỉ có nghĩa khi đã chọn cửa hàng", () => {
    expect(buildCatalogQuery({ all: true })).toBe("");
  });
});
