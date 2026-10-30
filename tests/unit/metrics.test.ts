import { describe, expect, it } from "vitest";
import { computeMetrics, totalMetrics } from "@/lib/metrics";

describe("computeMetrics — theo một cửa hàng (ADR-007)", () => {
  it.each([
    // [đặt, về, thiếu, tỷ lệ]
    [120, 90, 30, 0.75],
    [5, 7, 0, 1], // về > đặt: thiếu 0, tỷ lệ tối đa 100%
    [5, 3, 2, 0.6],
    [5, 5, 0, 1],
    [5, 0, 5, 0],
    [0, 0, 0, null], // đặt 0 → "—"
    [0, 4, 0, null],
  ])("đặt %i, về %i → thiếu %i, tỷ lệ %s", (ordered, received, shortage, rate) => {
    expect(computeMetrics(ordered, received)).toEqual({ ordered, received, shortage, rate });
  });
});

describe("totalMetrics — tổng tính trên số tổng", () => {
  it("ví dụ ADR-007: CH A đặt 5 về 7, CH B đặt 5 về 3 → thiếu tổng 0, tỷ lệ 100%", () => {
    const a = computeMetrics(5, 7);
    const b = computeMetrics(5, 3);
    expect(a.shortage).toBe(0);
    expect(b.shortage).toBe(2);

    const total = totalMetrics([
      { ordered: 5, received: 7, storeActive: true },
      { ordered: 5, received: 3, storeActive: true },
    ]);
    expect(total).toEqual({ ordered: 10, received: 10, shortage: 0, rate: 1 });
    // Không phải tổng các "thiếu" riêng lẻ (0 + 2).
    expect(total.shortage).not.toBe(a.shortage + b.shortage);
  });

  it("cửa hàng bị ẩn không cộng vào tổng", () => {
    const total = totalMetrics([
      { ordered: 5, received: 3, storeActive: true },
      { ordered: 100, received: 0, storeActive: false },
    ]);
    expect(total).toEqual({ ordered: 5, received: 3, shortage: 2, rate: 0.6 });
  });

  it("không có dòng SL hoặc tổng đặt 0 → tỷ lệ null", () => {
    expect(totalMetrics([])).toEqual({ ordered: 0, received: 0, shortage: 0, rate: null });
    expect(
      totalMetrics([
        { ordered: 0, received: 2, storeActive: true },
        { ordered: 0, received: 0, storeActive: true },
      ]),
    ).toEqual({ ordered: 0, received: 2, shortage: 0, rate: null });
  });
});
