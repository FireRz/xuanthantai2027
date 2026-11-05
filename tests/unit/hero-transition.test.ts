import { afterEach, describe, expect, it, vi } from "vitest";
import { canMorph, HERO, morphClose, waitFor } from "@/components/catalog/hero-transition";

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

  describe("startViewTransition ném lỗi ngay (không chạy được chuyển cảnh)", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("morphClose: vẫn đóng popup; tên view-transition của thẻ được gỡ sau khi cập nhật xong", async () => {
      const attrs = new Set<string>();
      const card = {
        style: { viewTransitionName: "" },
        getBoundingClientRect: () => ({
          width: 100,
          height: 100,
          top: 0,
          left: 0,
          bottom: 100,
          right: 100,
        }),
      };
      let dialogOpen = true;
      vi.stubGlobal("CSS", { escape: (s: string) => s });
      vi.stubGlobal("window", {
        innerWidth: 400,
        innerHeight: 800,
        matchMedia: () => ({ matches: false }),
      });
      vi.stubGlobal("document", {
        documentElement: {
          setAttribute: (n: string) => attrs.add(n),
          removeAttribute: (n: string) => attrs.delete(n),
          hasAttribute: (n: string) => attrs.has(n),
        },
        startViewTransition: () => {
          throw new Error("InvalidStateError");
        },
        querySelector: () => (dialogOpen ? {} : null),
        querySelectorAll: () => [card],
      });
      const close = vi.fn(() => (dialogOpen = false));

      morphClose("SKU1", close);
      expect(close).toHaveBeenCalledTimes(1);
      // Hàm cập nhật chạy xong (popup đã biến mất, thẻ đã được gán tên rồi phải được gỡ).
      await new Promise((r) => setTimeout(r, 100));
      expect(card.style.viewTransitionName).not.toBe(HERO);
      expect(card.style.viewTransitionName).toBe("");
      expect(attrs.has("data-hero-morph")).toBe(false);
    });
  });
});
