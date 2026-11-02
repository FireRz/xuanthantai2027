import { describe, expect, it } from "vitest";
import { createProductSchema, updateProductSchema } from "@/lib/validation/product";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const valid = { sku: "NTT001", brandId: id(1), productLineId: id(2) };

describe("T07.1 — schema sản phẩm", () => {
  it("đủ Mã, Nhãn, Dòng → hợp lệ; trường tùy chọn mặc định null", () => {
    const r = createProductSchema.parse(valid);
    expect(r).toMatchObject({
      sku: "NTT001",
      name: null,
      collectionId: null,
      materialId: null,
      priceRangeId: null,
      priceVnd: null,
    });
  });

  it("thiếu mã / nhãn / dòng → lỗi", () => {
    expect(createProductSchema.safeParse({ ...valid, sku: undefined }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, sku: "   " }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, brandId: undefined }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, productLineId: "" }).success).toBe(false);
  });

  it("mã bỏ khoảng trắng đầu/cuối; mã có khoảng trắng giữa hoặc ký tự cấm → lỗi", () => {
    expect(createProductSchema.parse({ ...valid, sku: "  NTT001 " }).sku).toBe("NTT001");
    expect(createProductSchema.safeParse({ ...valid, sku: "NTT 001" }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, sku: "NTT/001" }).success).toBe(false);
  });

  it("giá âm / thập phân / không phải số → lỗi; 0 và rỗng hợp lệ", () => {
    expect(createProductSchema.safeParse({ ...valid, priceVnd: -1 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, priceVnd: 1.5 }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...valid, priceVnd: "abc" }).success).toBe(false);
    expect(createProductSchema.parse({ ...valid, priceVnd: 0 }).priceVnd).toBe(0);
    expect(createProductSchema.parse({ ...valid, priceVnd: "" }).priceVnd).toBeNull();
    expect(createProductSchema.parse({ ...valid, priceVnd: "12.500.000" }).priceVnd).toBe(12500000);
  });

  it("BST trống / null / chuỗi rỗng hợp lệ = không thuộc BST", () => {
    for (const collectionId of [undefined, null, ""]) {
      expect(createProductSchema.parse({ ...valid, collectionId }).collectionId).toBeNull();
    }
    expect(createProductSchema.safeParse({ ...valid, collectionId: "không-phải-id" }).success).toBe(
      false,
    );
  });

  it("schema sửa không nhận mã: trường sku bị bỏ", () => {
    const r = updateProductSchema.parse({ ...valid, sku: "KHAC999" });
    expect(r).not.toHaveProperty("sku");
  });
});
