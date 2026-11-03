import { describe, expect, it } from "vitest";
import type { ProductKey, QuantityKey } from "@/lib/excel-template";
import { analyzeImport, type ReferenceData } from "@/server/import/analyze";
import type { SheetRow, WorkbookData } from "@/server/import/read-workbook";

const B1 = "b1";
const B2 = "b2";

function ref(): ReferenceData {
  return {
    brands: [
      { id: B1, name: "Phúc Lộc" },
      { id: B2, name: "Kim Bảo" },
    ],
    lines: [
      { id: "l1", brandId: B1, name: "Nhẫn" },
      { id: "l2", brandId: B1, name: "Dây chuyền" },
      { id: "l3", brandId: B2, name: "Lắc" },
    ],
    collections: [
      { id: "c1", brandId: B1, name: "Xuân 2027" },
      { id: "c2", brandId: B2, name: "Hè 2027" },
    ],
    materials: [{ id: "m1", name: "Vàng 24K" }],
    productTypes: [{ id: "t1", name: "Nhẫn trơn" }],
    priceRanges: [
      { id: "r1", name: "< 1tr" },
      { id: "r2", name: "2tr < 5tr" },
    ],
    stores: [
      { id: "s1", code: "CH01" },
      { id: "s2", code: "CH02" },
    ],
    products: [
      {
        id: "p1",
        sku: "AK0001",
        name: "Nhẫn A",
        brandId: B1,
        productLineId: "l1",
        collectionId: "c1",
        materialId: "m1",
        productTypeId: "t1",
        priceRangeId: "r1",
        priceVnd: 38_100_000,
      },
      {
        id: "p2",
        sku: "AK0002",
        name: null,
        brandId: B1,
        productLineId: "l1",
        collectionId: null,
        materialId: null,
        productTypeId: null,
        priceRangeId: null,
        priceVnd: null,
      },
    ],
    quantities: [{ productId: "p1", storeId: "s1", ordered: 10, received: 2 }],
  };
}

const prod = (row: number, cells: Partial<Record<ProductKey, string>>): SheetRow<ProductKey> => ({
  row,
  cells,
});
const qty = (row: number, cells: Partial<Record<QuantityKey, string>>): SheetRow<QuantityKey> => ({
  row,
  cells,
});

function file(
  products: SheetRow<ProductKey>[] | null,
  quantities: SheetRow<QuantityKey>[] | null = null,
): WorkbookData {
  return {
    products: products && { rows: products, missingColumns: [] },
    quantities: quantities && { rows: quantities, missingColumns: [] },
  };
}

const run = (f: WorkbookData, r = ref()) => analyzeImport(f, r);
const reasons = (f: WorkbookData, r = ref()) =>
  run(f, r).issues.map((i) => `${i.sheet}|${i.row}|${i.column}|${i.reason}`);

describe("T08.7 — phân loại (AC4)", () => {
  it("SP mới, SP thay đổi, không đổi, dòng SL thay đổi, không đổi", () => {
    const a = run(
      file(
        [
          prod(2, { sku: "NEW1", brand: "Phúc Lộc", line: "Nhẫn" }),
          prod(3, { sku: "AK0001", price: "39.000.000" }),
          prod(4, { sku: "AK0002" }),
        ],
        [
          qty(2, { sku: "AK0001", store: "CH01", received: "5" }),
          qty(3, { sku: "AK0001", store: "CH01", ordered: "10" }), // dòng này trùng cặp → lỗi R12 (kiểm riêng)
        ],
      ),
    );
    expect(a.summary.newProducts).toBe(1);
    expect(a.summary.changedProducts).toBe(1);
    expect(a.summary.unchangedProducts).toBe(1);
    expect(a.summary.changedQuantities).toBe(1);
    expect(a.productItems[1]).toMatchObject({
      sku: "AK0001",
      kind: "changed",
      changes: [{ column: "Giá bán lẻ", old: "38.100.000", new: "39.000.000" }],
    });
    expect(a.quantityItems[0]).toMatchObject({
      sku: "AK0001",
      store: "CH01",
      old: { ordered: 10, received: 2 },
      new: { ordered: 10, received: 5 },
    });
  });

  it("file khớp hệt dữ liệu hiện có → 0 thay đổi, 0 lỗi", () => {
    const a = run(
      file(
        [
          prod(2, {
            sku: "AK0001",
            name: "Nhẫn A",
            brand: "Phúc Lộc",
            line: "Nhẫn",
            collection: "Xuân 2027",
            material: "Vàng 24K",
            productType: "nhẫn  TRƠN",
            priceRange: "< 1tr",
            price: "38100000",
          }),
          prod(3, { sku: "AK0002", brand: "Phúc Lộc", line: "Nhẫn" }),
        ],
        [qty(2, { sku: "AK0001", store: "CH01", ordered: "10", received: "2" })],
      ),
    );
    expect(a.issues).toEqual([]);
    expect(a.summary).toMatchObject({
      newProducts: 0,
      changedProducts: 0,
      changedQuantities: 0,
      unchangedProducts: 2,
      unchangedQuantities: 1,
      errors: 0,
    });
  });

  it("file mẫu trống (không có dòng nào) → không lỗi, không thay đổi", () => {
    const a = run(file([], []));
    expect(a.issues).toEqual([]);
    expect(a.summary.errors + a.summary.newProducts + a.summary.changedQuantities).toBe(0);
  });
});

describe("T08.7 — R3 ghi đè, R6 ô trống giữ nguyên, R4 về > đặt", () => {
  it("R3: giá trị trong file ghi đè (AC2: đặt 10 → 15)", () => {
    const a = run(file(null, [qty(2, { sku: "AK0001", store: "CH01", ordered: "15" })]));
    expect(a.quantityItems[0]).toMatchObject({
      old: { ordered: 10, received: 2 },
      new: { ordered: 15, received: 2 },
    });
    expect(a.plan.quantityWrites).toEqual([
      { productId: "p1", newSku: null, storeId: "s1", ordered: 15, received: 2 },
    ]);
  });

  it("R6: ô trống giữ nguyên (AC3) — SP đã có không bị xóa BST/tuổi vàng/giá", () => {
    const a = run(file([prod(2, { sku: "AK0001", name: "Nhẫn A mới" })]));
    expect(a.productItems[0].changes).toEqual([
      { column: "Tên SP", old: "Nhẫn A", new: "Nhẫn A mới" },
    ]);
    expect(a.plan.productUpdates[0]).toMatchObject({
      id: "p1",
      collectionId: "c1",
      materialId: "m1",
      productTypeId: "t1",
      priceRangeId: "r1",
      priceVnd: 38_100_000,
    });
  });

  it("Chủng loại: đổi sang loại có sẵn → ghi nhận thay đổi; loại chưa có → tự tạo, trùng tên chỉ tạo một lần", () => {
    const a = run(
      file([
        prod(2, { sku: "AK0002", productType: "Nhẫn trơn" }),
        prod(3, { sku: "N1", brand: "Phúc Lộc", line: "Nhẫn", productType: "Dây chuyền" }),
        prod(4, { sku: "N2", brand: "Phúc Lộc", line: "Nhẫn", productType: "dây CHUYỀN" }),
      ]),
    );
    expect(a.issues).toEqual([]);
    expect(a.productItems[0].changes).toEqual([
      { column: "Chủng loại", old: "—", new: "Nhẫn trơn" },
    ]);
    expect(a.plan.productUpdates[0]).toMatchObject({ id: "p2", productTypeId: "t1" });
    expect(a.plan.newCatalog.productTypes).toHaveLength(1);
    expect(a.newCatalogLabels).toEqual(["Chủng loại: Dây chuyền"]);
  });

  it("R6: SL ô trống = giữ nguyên; gõ 0 thì về 0", () => {
    const a = run(file(null, [qty(2, { sku: "AK0001", store: "CH01", ordered: "0" })]));
    expect(a.plan.quantityWrites[0]).toMatchObject({ ordered: 0, received: 2 });
  });

  it("R6: SP mới — ô tùy chọn trống để trống; cặp mới chỉ điền 1 số → số kia = 0", () => {
    const a = run(
      file(
        [prod(2, { sku: "NEW1", brand: "Phúc Lộc", line: "Nhẫn" })],
        [qty(2, { sku: "NEW1", store: "CH02", ordered: "7" })],
      ),
    );
    expect(a.plan.newProducts[0]).toMatchObject({
      sku: "NEW1",
      name: null,
      collectionId: null,
      materialId: null,
      productTypeId: null,
      priceRangeId: null,
      priceVnd: null,
    });
    expect(a.plan.quantityWrites[0]).toMatchObject({
      productId: null,
      newSku: "NEW1",
      storeId: "s2",
      ordered: 7,
      received: 0,
    });
  });

  it("R4: SL về > SL đặt được phép, không lỗi", () => {
    const a = run(
      file(null, [qty(2, { sku: "AK0001", store: "CH01", ordered: "5", received: "9" })]),
    );
    expect(a.issues).toEqual([]);
    expect(a.plan.quantityWrites[0]).toMatchObject({ ordered: 5, received: 9 });
  });

  it("R8: cặp (SP, CH) không có trong file → giữ nguyên (không có thao tác ghi)", () => {
    const a = run(
      file(null, [qty(2, { sku: "AK0002", store: "CH02", ordered: "0", received: "0" })]),
    );
    expect(a.plan.quantityWrites).toEqual([]);
    expect(a.summary.unchangedQuantities).toBe(1);
  });
});

describe("T08.7 — R5, R7 chưa có → lỗi (AC5, AC7)", () => {
  it("cửa hàng chưa có: ghi rõ sheet, dòng, cột, lý do", () => {
    const r = reasons(file(null, [qty(12, { sku: "AK0001", store: "CH99", ordered: "1" })]));
    expect(r).toEqual(['SoLuong|12|Mã cửa hàng|Mã cửa hàng "CH99" chưa có trên web']);
  });

  it("nhãn, dòng, BST, tuổi vàng, khung giá chưa có → tự tạo, không báo lỗi", () => {
    const f = file([
      prod(2, { sku: "N1", brand: "Không có", line: "Nhẫn" }),
      prod(3, { sku: "N2", brand: "Phúc Lộc", line: "Vòng" }),
      prod(4, { sku: "N3", brand: "Phúc Lộc", line: "Nhẫn", collection: "Xuân 2028" }),
      prod(5, { sku: "N4", brand: "Phúc Lộc", line: "Nhẫn", material: "Bạc" }),
      prod(6, { sku: "N5", brand: "Phúc Lộc", line: "Nhẫn", priceRange: "9tr < 10tr" }),
    ]);
    expect(reasons(f)).toEqual([]);
    const a = run(f);
    expect(a.plan.newProducts).toHaveLength(5);
    expect(a.newCatalogLabels).toEqual([
      "Nhãn hàng: Không có",
      "Dòng hàng: Nhẫn (Không có)",
      "Dòng hàng: Vòng (Phúc Lộc)",
      "Bộ sưu tập: Xuân 2028 (Phúc Lộc)",
      "Tuổi vàng: Bạc",
      "Khung giá: 9tr < 10tr",
    ]);
  });

  it("danh mục mới trùng tên trong file chỉ tạo một lần", () => {
    const a = run(
      file([
        prod(2, { sku: "N1", brand: "Mới", line: "Nhẫn", material: "Bạc" }),
        prod(3, { sku: "N2", brand: "mới", line: "nhẫn", material: "BẠC" }),
      ]),
    );
    expect(a.plan.newCatalog.brands).toHaveLength(1);
    expect(a.plan.newCatalog.lines).toHaveLength(1);
    expect(a.plan.newCatalog.materials).toHaveLength(1);
  });

  it("SP mới thiếu nhãn / dòng (P4)", () => {
    expect(reasons(file([prod(2, { sku: "N1" })]))).toEqual([
      "SanPham|2|Nhãn hàng|Bắt buộc khi tạo SP mới",
      "SanPham|2|Dòng hàng|Bắt buộc khi tạo SP mới",
    ]);
  });
});

describe("T08.7 — R9, R13 cùng nhãn", () => {
  it("dòng thuộc nhãn khác → tạo dòng mới trong nhãn này", () => {
    const a = run(file([prod(2, { sku: "N1", brand: "Phúc Lộc", line: "Lắc" })]));
    expect(a.summary.errors).toBe(0);
    expect(a.newCatalogLabels).toEqual(["Dòng hàng: Lắc (Phúc Lộc)"]);
  });

  it("BST thuộc nhãn khác → tạo BST mới trong nhãn này", () => {
    const a = run(
      file([prod(2, { sku: "N1", brand: "Phúc Lộc", line: "Nhẫn", collection: "Hè 2027" })]),
    );
    expect(a.summary.errors).toBe(0);
    expect(a.newCatalogLabels).toEqual(["Bộ sưu tập: Hè 2027 (Phúc Lộc)"]);
  });

  it("R13: SP đã có đổi nhãn mà không đổi dòng → lỗi; có BST cũ mà không đổi BST → lỗi", () => {
    const r = reasons(file([prod(2, { sku: "AK0001", brand: "Kim Bảo" })]));
    expect(r).toHaveLength(2);
    expect(r[0]).toContain("SanPham|2|Dòng hàng|Đổi nhãn sang Kim Bảo");
    expect(r[1]).toContain("SanPham|2|Bộ sưu tập|Đổi nhãn sang Kim Bảo");
  });

  it("R13: đổi nhãn kèm dòng và BST thuộc nhãn mới → hợp lệ; SP không có BST không cần điền BST", () => {
    const ok = run(
      file([
        prod(2, { sku: "AK0001", brand: "Kim Bảo", line: "Lắc", collection: "Hè 2027" }),
        prod(3, { sku: "AK0002", brand: "Kim Bảo", line: "Lắc" }),
      ]),
    );
    expect(ok.issues).toEqual([]);
    expect(ok.plan.productUpdates).toHaveLength(2);
    expect(ok.plan.productUpdates[0]).toMatchObject({
      brandId: B2,
      productLineId: "l3",
      collectionId: "c2",
    });
  });

  it("đổi dòng trong cùng nhãn (không điền nhãn) → hợp lệ", () => {
    const a = run(file([prod(2, { sku: "AK0001", line: "Dây chuyền" })]));
    expect(a.issues).toEqual([]);
    expect(a.productItems[0].changes).toEqual([
      { column: "Dòng hàng", old: "Nhẫn", new: "Dây chuyền" },
    ]);
  });
});

describe("T08.7 — R11, R12 mã SP", () => {
  it("R11: Mã SP trong SoLuong phải có trong SanPham của file hoặc đã có trên web", () => {
    expect(reasons(file(null, [qty(5, { sku: "XXX", store: "CH01", ordered: "1" })]))).toEqual([
      'SoLuong|5|Mã SP|Mã SP "XXX" không có trong sheet SanPham của file và chưa có trên web',
    ]);
    // có trong SanPham của file → hợp lệ
    const ok = run(
      file(
        [prod(2, { sku: "XXX", brand: "Phúc Lộc", line: "Nhẫn" })],
        [qty(5, { sku: "xxx", store: "ch01", ordered: "1" })],
      ),
    );
    expect(ok.issues).toEqual([]);
  });

  it("R12: trùng Mã SP trong SanPham", () => {
    const r = reasons(
      file([
        prod(2, { sku: "N1", brand: "Phúc Lộc", line: "Nhẫn" }),
        prod(7, { sku: "n1", brand: "Phúc Lộc", line: "Nhẫn" }),
      ]),
    );
    expect(r).toEqual(["SanPham|7|Mã SP|Mã SP trùng với dòng 2 của sheet này"]);
  });

  it("R12: trùng (Mã SP, Mã CH) trong SoLuong", () => {
    const r = reasons(
      file(null, [
        qty(2, { sku: "AK0001", store: "CH01", ordered: "1" }),
        qty(9, { sku: "ak0001", store: "ch01", ordered: "2" }),
      ]),
    );
    expect(r).toEqual(["SoLuong|9|Mã SP|Cặp (Mã SP, Mã cửa hàng) trùng với dòng 2 của sheet này"]);
  });

  it("Mã SP có ký tự không hợp lệ / thiếu mã", () => {
    const r = reasons(
      file([
        prod(2, { sku: "A B", brand: "Phúc Lộc", line: "Nhẫn" }),
        prod(3, { name: "Chỉ có tên" }),
      ]),
    );
    expect(r[0]).toContain("SanPham|2|Mã SP|");
    expect(r[1]).toBe("SanPham|3|Mã SP|Thiếu Mã SP");
  });
});

describe("T08.7 — giá trị số", () => {
  it("SL không phải số nguyên ≥ 0 (âm, lẻ, chữ)", () => {
    const f = file(null, [
      qty(2, { sku: "AK0001", store: "CH01", ordered: "-1" }),
      qty(3, { sku: "AK0001", store: "CH02", ordered: "1.5" }),
      qty(4, { sku: "AK0002", store: "CH01", received: "abc" }),
    ]);
    expect(reasons(f)).toEqual([
      "SoLuong|2|SL đặt|Số lượng phải là số nguyên ≥ 0",
      // "1.5" không phải nhóm hàng nghìn (cần đúng 3 chữ số) nên là số lẻ → lỗi, không đoán thành 15
      "SoLuong|3|SL đặt|Số lượng phải là số nguyên ≥ 0",
      "SoLuong|4|SL đã về|Số lượng phải là số nguyên ≥ 0",
    ]);
  });

  it('"1.000" đọc là 1000 (dấu phân cách hàng nghìn)', () => {
    const a = run(file(null, [qty(2, { sku: "AK0001", store: "CH01", ordered: "1.000" })]));
    expect(a.plan.quantityWrites[0].ordered).toBe(1000);
  });

  it("giá: âm / lẻ / chữ → lỗi", () => {
    const f = file([
      prod(2, { sku: "AK0001", price: "-5" }),
      prod(3, { sku: "AK0002", price: "12abc" }),
    ]);
    expect(reasons(f)).toEqual([
      "SanPham|2|Giá bán lẻ|Giá bán lẻ phải là số nguyên VND ≥ 0",
      "SanPham|3|Giá bán lẻ|Giá bán lẻ phải là số nguyên VND ≥ 0",
    ]);
  });
});

describe("T08.7 — R15 so khớp không phân biệt hoa/thường và khoảng trắng", () => {
  it("tên danh mục, mã SP, mã CH", () => {
    const a = run(
      file(
        [prod(2, { sku: "ak0001", brand: "  phúc   LỘC ", line: "NHẪN", material: "vàng 24k" })],
        [qty(2, { sku: " Ak0001 ", store: "ch01", ordered: "3" })],
      ),
    );
    expect(a.issues).toEqual([]);
    expect(a.summary.changedQuantities).toBe(1);
    expect(a.productItems).toEqual([]); // nhãn/dòng/tuổi vàng giống hệt → không đổi
  });
});

describe("T08.7 — lỗi cấp file", () => {
  it("không có sheet nào hợp lệ", () => {
    expect(reasons(file(null, null))).toEqual([
      'File|0||Không tìm thấy sheet "SanPham" hoặc "SoLuong". Hãy dùng file mẫu của hệ thống.',
    ]);
  });

  it("thiếu cột bắt buộc", () => {
    const f: WorkbookData = {
      products: { rows: [], missingColumns: ["Mã SP"] },
      quantities: { rows: [], missingColumns: ["Mã cửa hàng"] },
    };
    expect(reasons(f)).toEqual([
      'SanPham|1|Mã SP|Thiếu cột "Mã SP" ở dòng tiêu đề',
      'SoLuong|1|Mã cửa hàng|Thiếu cột "Mã cửa hàng" ở dòng tiêu đề',
    ]);
  });
});

describe("T08.7 — nhiều lỗi (mockup): đếm đủ, vẫn phân loại dòng đúng", () => {
  it("3 lỗi + 2 thay đổi", () => {
    const a = run(
      file(
        [prod(18, { sku: "AK0001", price: "abc" }), prod(9, { sku: "AK0002", price: "39000000" })],
        [
          qty(41, { sku: "AK0001", store: "CH999", ordered: "1" }),
          qty(77, { sku: "AK0002", store: "CH01", ordered: "-2" }),
          qty(12, { sku: "AK0001", store: "CH01", received: "5" }),
        ],
      ),
    );
    expect(a.summary).toMatchObject({ errors: 3, changedProducts: 1, changedQuantities: 1 });
  });
});
