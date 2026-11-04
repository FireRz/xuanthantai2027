import { describe, expect, it } from "vitest";
import { parseGroupDim } from "@/lib/analytics-params";

describe("parseGroupDim", () => {
  it("giá trị hợp lệ giữ nguyên", () => {
    expect(parseGroupDim("line")).toBe("line");
    expect(parseGroupDim("store")).toBe("store");
  });
  it("giá trị lạ hoặc thiếu → brand", () => {
    expect(parseGroupDim("x")).toBe("brand");
    expect(parseGroupDim(undefined)).toBe("brand");
    expect(parseGroupDim("")).toBe("brand");
  });
  it("tham số lặp lấy giá trị đầu", () => {
    expect(parseGroupDim(["pr", "line"])).toBe("pr");
    expect(parseGroupDim([])).toBe("brand");
  });
});
