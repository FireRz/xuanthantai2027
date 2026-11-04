import { describe, expect, it } from "vitest";
import {
  buildCatalogQuery,
  PAGE_SIZE,
  parseCatalogParams,
  pruneInvalidSelections,
} from "@/lib/catalog-params";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("parseCatalogParams", () => {
  it("không có tham số → mặc định: Lưới, Mã A→Z, tổng hệ thống", () => {
    expect(parseCatalogParams({})).toEqual({
      brand: [],
      line: [],
      col: [],
      mat: [],
      typ: [],
      pr: [],
      store: null,
      all: false,
      q: "",
      sort: "sku",
      view: "grid",
      sp: null,
      n: PAGE_SIZE,
      photo: false,
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

  it("xem=hinh bật chế độ hình; giá trị khác thì tắt", () => {
    expect(parseCatalogParams({ xem: "hinh" }).photo).toBe(true);
    expect(parseCatalogParams({ xem: "abc" }).photo).toBe(false);
    expect(parseCatalogParams({}).photo).toBe(false);
  });

  it("chế độ hình: sort shortage/sold rơi về sku", () => {
    expect(parseCatalogParams({ xem: "hinh", sort: "shortage" }).sort).toBe("sku");
    expect(parseCatalogParams({ xem: "hinh", sort: "sold" }).sort).toBe("sku");
    expect(parseCatalogParams({ xem: "hinh", sort: "price_desc" }).sort).toBe("price_desc");
    expect(parseCatalogParams({ sort: "sold" }).sort).toBe("sold");
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
      xem: "hinh",
    });
    expect(
      parseCatalogParams(Object.fromEntries(new URLSearchParams(buildCatalogQuery(p)))),
    ).toEqual(p);
  });
  it("buildCatalogQuery ghi xem=hinh", () => {
    expect(buildCatalogQuery({ photo: true })).toBe("?xem=hinh");
    expect(buildCatalogQuery({ photo: false })).toBe("");
  });
  it("all chỉ có nghĩa khi đã chọn cửa hàng", () => {
    expect(buildCatalogQuery({ all: true })).toBe("");
  });
});

describe("T04.2 — bộ đọc/ghi URL cho đủ 5 bộ lọc", () => {
  const B1 = "11111111-1111-4111-8111-111111111111";
  const B2 = "22222222-2222-4222-8222-222222222222";

  it("quay vòng URL ↔ object với mọi tham số", () => {
    const url = `?brand=${B1},${B2}&line=${ID}&col=${ID},none&mat=${B1}&typ=${ID},rác&pr=${B2},rác&store=CH01&all=1&q=ntt&sort=shortage&view=list&sp=NTT001&n=48`;
    const p = parseCatalogParams(Object.fromEntries(new URLSearchParams(url)));
    expect(p).toEqual({
      brand: [B1, B2],
      line: [ID],
      col: [ID, "none"],
      mat: [B1],
      typ: [ID],
      pr: [B2],
      store: "CH01",
      all: true,
      q: "ntt",
      sort: "shortage",
      view: "list",
      sp: "NTT001",
      n: 48,
      photo: false,
    });
    expect(
      parseCatalogParams(Object.fromEntries(new URLSearchParams(buildCatalogQuery(p)))),
    ).toEqual(p);
  });

  it("tham số lặp lấy giá trị đầu; mảng id được gộp", () => {
    const p = parseCatalogParams({ sort: ["price_asc", "sku"], brand: [B1, `${B2},rác`] });
    expect(p.sort).toBe("price_asc");
    expect(p.brand).toEqual([B1, B2]);
  });

  it("q quá dài bị cắt 100 ký tự; all=0 hoặc lạ là tắt", () => {
    expect(parseCatalogParams({ q: "a".repeat(300) }).q).toHaveLength(100);
    expect(parseCatalogParams({ all: "true" }).all).toBe(false);
  });
});

describe("T04.9 — pruneInvalidSelections", () => {
  const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const LA = "1aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const LB = "1bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const lines = [
    { id: LA, brandId: A },
    { id: LB, brandId: B },
  ];
  const cols = [{ id: ID, brandId: B }];

  it("đổi sang nhãn A → bỏ dòng/BST của nhãn B, giữ 'none'", () => {
    const r = pruneInvalidSelections(
      { brand: [A], line: [LA, LB], col: [ID, "none"] },
      lines,
      cols,
    );
    expect(r).toEqual({ brand: [A], line: [LA], col: ["none"] });
  });
  it("không chọn nhãn → giữ mọi id còn tồn tại, bỏ id lạ", () => {
    const r = pruneInvalidSelections(
      { brand: [], line: [LA, "99999999-9999-4999-8999-999999999999"], col: [ID] },
      lines,
      cols,
    );
    expect(r).toEqual({ brand: [], line: [LA], col: [ID] });
  });
});
