import { describe, expect, it } from "vitest";
import { regionLabel, sameRegion, sortRegions } from "@/lib/region";

describe("khu vực cửa hàng", () => {
  it("chỉ là số → 'Khu vực n'; chữ giữ nguyên", () => {
    expect(regionLabel("1")).toBe("Khu vực 1");
    expect(regionLabel(" 12 ")).toBe("Khu vực 12");
    expect(regionLabel("Cần Thơ")).toBe("Cần Thơ");
  });
  it("so khớp không phân biệt hoa/thường, khoảng trắng hai đầu; rỗng không khớp", () => {
    expect(sameRegion("kv1", " KV1 ")).toBe(true);
    expect(sameRegion("1", "2")).toBe(false);
    expect(sameRegion(null, "1")).toBe(false);
    expect(sameRegion("", "")).toBe(false);
  });
  it("danh sách: bỏ trống/trùng, thứ tự tự nhiên 1, 2, 10", () => {
    expect(sortRegions(["10", "2", null, "1", " 2", "", "b", "A"])).toEqual([
      "1",
      "2",
      "10",
      "A",
      "b",
    ]);
  });
});
