/** Hằng số + quy tắc chuyển động khi lướt SP trong popup (kiểu album ảnh). */

/** Vuốt ngang quá ngưỡng này (px) khi thả tay thì chuyển SP. */
export const SWIPE_PX = 60;
/** Vuốt nhanh (px/ms) thì chuyển dù chưa tới ngưỡng. */
export const FLICK_SPEED = 0.5;
/** Di chuyển tối thiểu (px) trước khi quyết định vuốt ngang hay cuộn dọc. */
export const SLOP = 10;

/** Thời lượng (ms): SP cũ trượt ra, SP mới trượt vào, nảy báo hết SP. */
export const EXIT_MS = 180;
export const ENTER_MS = 340;
export const EDGE_MS = 260;
/** Đường cong có nảy nhẹ (vào chỗ, kéo về, nảy báo hết). */
export const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export type SwipeDecision = "next" | "prev" | "cancel" | "edge-next" | "edge-prev";

/**
 * Thả tay sau khi vuốt ngang: chuyển SP, hủy (kéo về chỗ cũ) hay nảy báo hết SP phía đó.
 * Vuốt trái (dx < 0) = SP sau. `released` = false khi bị hủy (pointercancel) → luôn hủy.
 */
export function swipeDecision(input: {
  dx: number;
  dtMs: number;
  released: boolean;
  hasPrev: boolean;
  hasNext: boolean;
}): SwipeDecision {
  const { dx, dtMs, released, hasPrev, hasNext } = input;
  const dist = Math.abs(dx);
  const fast = dist / Math.max(dtMs, 1) > FLICK_SPEED;
  if (!released || !(dist > SWIPE_PX || (fast && dist > SLOP * 2))) return "cancel";
  if (dx < 0) return hasNext ? "next" : "edge-next";
  return hasPrev ? "prev" : "edge-prev";
}

/** Người dùng chọn giảm chuyển động (máy chủ chưa biết → coi như có, không chạy hiệu ứng). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
