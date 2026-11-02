import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/metrics";
import { stockStatus } from "@/lib/status";

const status = (ordered: number, received: number) =>
  stockStatus(computeMetrics(ordered, received));

describe("T03.10 — trạng thái hàng về (UI-DESIGN §4)", () => {
  it("Đặt = 0 → Không đặt, kể cả khi đã có hàng về", () => {
    expect(status(0, 0)).toBe("noorder");
    expect(status(0, 5)).toBe("noorder");
  });
  it("Về = 0 (Đặt > 0) → Chưa về", () => {
    expect(status(10, 0)).toBe("none");
  });
  it("Thiếu = 0 → Đủ hàng, kể cả về > đặt", () => {
    expect(status(10, 10)).toBe("full");
    expect(status(5, 7)).toBe("full");
  });
  it("còn lại → Còn thiếu", () => {
    expect(status(120, 90)).toBe("short");
    expect(status(2, 1)).toBe("short");
  });
  it("thứ tự kiểm tra: Không đặt thắng Chưa về", () => {
    expect(status(0, 0)).not.toBe("none");
  });
});
