import { describe, expect, it } from "vitest";
import { canMorph, waitFor } from "@/components/catalog/hero-transition";

describe("hero-transition — ảnh thẻ bay vào/ra popup", () => {
  const keys = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, button: 0 };

  it("canMorph: phím bổ trợ / nút chuột khác / không có View Transitions → không bay", () => {
    expect(canMorph({ ...keys, ctrlKey: true })).toBe(false);
    expect(canMorph({ ...keys, metaKey: true })).toBe(false);
    expect(canMorph({ ...keys, button: 1 })).toBe(false);
    expect(canMorph(keys)).toBe(false); // node: không có document.startViewTransition
    expect(canMorph()).toBe(false);
  });

  it("waitFor: hết hạn thì resolve false, không treo (Review Focus 5)", async () => {
    await expect(waitFor(() => false, 50)).resolves.toBe(false);
  });

  it("waitFor: điều kiện đúng trước hạn → true", async () => {
    let ok = false;
    setTimeout(() => (ok = true), 20);
    await expect(waitFor(() => ok, 500)).resolves.toBe(true);
  });
});
