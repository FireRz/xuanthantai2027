import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cấu hình Vitest", () => {
  it("chạy được và hiểu alias @/", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
