import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GroupTable, sortGroupRows } from "@/components/analytics/group-table";
import { CatalogNavProvider } from "@/components/catalog/catalog-nav";
import type { GroupDim } from "@/lib/analytics-params";
import { parseCatalogParams } from "@/lib/catalog-params";
import type { AnalyticsTotals, GroupRow } from "@/server/services/analytics";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function row(p: Partial<GroupRow> & Pick<GroupRow, "id" | "name">): GroupRow {
  return {
    brandName: null,
    products: 1,
    ordered: 10,
    received: 5,
    shortage: 5,
    sold: 2,
    stock: 3,
    receivedRate: 0.5,
    sellRate: 0.4,
    ...p,
  };
}

const rows: GroupRow[] = [
  row({ id: ID_A, name: "Nhãn A", products: 3 }),
  row({ id: null, name: "Rỗng", products: 1, receivedRate: null, ordered: 0 }),
  row({ id: ID_B, name: "Nhãn B", products: 7 }),
];

const total: AnalyticsTotals = {
  products: 11,
  ordered: 20,
  received: 10,
  shortage: 10,
  sold: 6,
  stock: 9,
  receivedRate: 0.5,
  sellRate: 0.4,
};

const html = (dim: GroupDim, list: GroupRow[] = rows) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop
    createElement(CatalogNavProvider, {
      params: parseCatalogParams({}),
      path: "/phan-tich",
      keep: dim === "brand" ? "" : `nhom=${dim}`,
      children: createElement(GroupTable, { rows: list, total, dim }),
    }),
  );

describe("GroupTable", () => {
  it("mặc định sắp theo Số mã giảm dần", () => {
    const out = html("brand");
    const b = out.indexOf("Nhãn B");
    const a = out.indexOf("Nhãn A");
    const empty = out.indexOf("Rỗng");
    expect(b).toBeGreaterThan(-1);
    expect(b).toBeLessThan(a);
    expect(a).toBeLessThan(empty);
  });

  it("có thanh tỷ lệ và dòng tổng", () => {
    const out = html("brand");
    expect(out).toContain('data-testid="rate-bar"');
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('data-testid="group-total"');
  });

  it("% về null hiện —", () => {
    const out = html("brand");
    const start = out.indexOf('data-name="Rỗng"');
    const end = out.indexOf("</tr>", start);
    expect(out.slice(start, end)).toContain("—");
  });

  it("tên nhóm là link thêm giá trị vào bộ lọc, giữ nhom", () => {
    expect(html("brand")).toContain(`href="/phan-tich?brand=${ID_A}"`);
    expect(html("line")).toContain(`href="/phan-tich?line=${ID_A}&amp;nhom=line"`);
  });

  it("dòng rỗng của BST thêm col=none", () => {
    expect(html("col")).toContain('href="/phan-tich?col=none&amp;nhom=col"');
  });

  it.each(["mat", "typ", "pr"] as const)("dòng rỗng của %s không phải link", (dim) => {
    const out = html(dim);
    const start = out.indexOf('data-name="Rỗng"');
    const end = out.indexOf("</tr>", start);
    expect(out.slice(start, end)).not.toContain("<a ");
  });

  it("chiều cửa hàng: bấm tên chọn cửa hàng", () => {
    const out = html("store", [row({ id: "CH01", name: "Cửa hàng 1" })]);
    expect(out).toContain('href="/phan-tich?store=CH01&amp;nhom=store"');
  });

  it("dòng và BST hiện kèm tên nhãn", () => {
    const out = html("line", [row({ id: ID_A, name: "Nhẫn", brandName: "Nhãn Gold" })]);
    expect(out).toContain("Nhãn Gold");
  });

  it("dòng có nút mở rộng cho điện thoại (aria-expanded)", () => {
    expect(html("brand")).toContain('aria-expanded="false"');
  });
});

describe("sortGroupRows", () => {
  it("theo % bán giảm dần, null xếp cuối", () => {
    const list = [
      row({ id: "1", name: "x", sellRate: null }),
      row({ id: "2", name: "y", sellRate: 0.2 }),
      row({ id: "3", name: "z", sellRate: 0.9 }),
    ];
    expect(sortGroupRows(list, "sellRate", "desc").map((r) => r.id)).toEqual(["3", "2", "1"]);
    expect(sortGroupRows(list, "sellRate", "asc").map((r) => r.id)).toEqual(["2", "3", "1"]);
  });

  it("theo tên tăng dần theo thứ tự tiếng Việt", () => {
    const list = ["Đỏ", "Dây", "Ánh", "Bạc"].map((name) => row({ id: name, name }));
    expect(sortGroupRows(list, "name", "asc").map((r) => r.name)).toEqual([
      "Ánh",
      "Bạc",
      "Dây",
      "Đỏ",
    ]);
  });

  it("không đổi mảng gốc", () => {
    const list = [row({ id: "1", name: "b" }), row({ id: "2", name: "a" })];
    sortGroupRows(list, "name", "asc");
    expect(list.map((r) => r.id)).toEqual(["1", "2"]);
  });
});
