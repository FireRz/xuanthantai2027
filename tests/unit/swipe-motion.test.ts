import { describe, expect, it } from "vitest";
import { swipeDecision } from "@/components/catalog/swipe-motion";

describe("swipeDecision — quyết định khi thả tay vuốt trong popup", () => {
  const base = { dtMs: 300, released: true, hasPrev: true, hasNext: true };

  it("quá ngưỡng: vuốt trái = SP sau, vuốt phải = SP trước", () => {
    expect(swipeDecision({ ...base, dx: -61 })).toBe("next");
    expect(swipeDecision({ ...base, dx: 61 })).toBe("prev");
  });

  it("dưới ngưỡng và chậm → hủy", () => {
    expect(swipeDecision({ ...base, dx: -40 })).toBe("cancel");
  });

  it("vuốt nhanh > 0.5 px/ms và > 2×SLOP → chuyển; nhanh nhưng quá ngắn → hủy", () => {
    expect(swipeDecision({ ...base, dx: -25, dtMs: 40 })).toBe("next");
    expect(swipeDecision({ ...base, dx: -15, dtMs: 10 })).toBe("cancel");
  });

  it("phía đó không có SP → nảy báo hết (edge-*)", () => {
    expect(swipeDecision({ ...base, dx: -80, hasNext: false })).toBe("edge-next");
    expect(swipeDecision({ ...base, dx: 80, hasPrev: false })).toBe("edge-prev");
  });

  it("pointercancel (không phải thả tay) → hủy dù đã quá ngưỡng", () => {
    expect(swipeDecision({ ...base, dx: -80, released: false })).toBe("cancel");
  });
});
