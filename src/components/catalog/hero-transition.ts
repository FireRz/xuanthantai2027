/**
 * Ảnh thẻ SP "bay" vào popup khi mở và bay về thẻ khi đóng (View Transitions API của trình duyệt).
 * Trình duyệt không hỗ trợ, người dùng chọn giảm chuyển động, hay bấm kèm phím (mở tab mới…) → không bay,
 * chức năng mở/đóng popup vẫn như cũ. Mọi lần chờ đều có hạn (`HERO_TIMEOUT_MS`): dữ liệu chậm thì
 * hiệu ứng chỉ mờ chéo rồi thôi, giao diện không bị "đóng băng".
 */
import { prefersReducedMotion } from "./swipe-motion";

/** Tên view-transition dùng chung cho ảnh thẻ và ảnh trong popup. */
export const HERO = "product-hero";
/** Thời lượng ảnh bay (ms) — khớp với CSS `::view-transition-group(product-hero)`. */
export const HERO_MS = 380;
/** Chờ popup hiện / biến mất tối đa bấy nhiêu ms rồi cho hiệu ứng chạy tiếp (không treo). */
export const HERO_TIMEOUT_MS = 800;

/** Thuộc tính của sự kiện bấm cần xét (MouseEvent của React hay DOM đều có). */
export interface ClickKeys {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}

interface HeroTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}
type StartViewTransition = (update: () => Promise<void>) => HeroTransition;

function starter(): StartViewTransition | null {
  if (typeof document === "undefined") return null;
  const start = (document as { startViewTransition?: unknown }).startViewTransition;
  return typeof start === "function" ? (start.bind(document) as StartViewTransition) : null;
}

/** Có cho ảnh bay không: cần View Transitions, không giảm chuyển động, bấm chuột trái không kèm phím. */
export function canMorph(e?: ClickKeys): boolean {
  if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0)) return false;
  if (!starter()) return false;
  return !prefersReducedMotion();
}

/**
 * Kiểm `check` mỗi khung hình tới khi đúng (→ true) hoặc hết `timeoutMs` (→ false, không bao giờ reject).
 * Mỗi lượt hẹn bằng cả `requestAnimationFrame` lẫn `setTimeout(…, 16)`, cái nào tới trước thì chạy:
 * trong lúc trình duyệt chờ hàm cập nhật của View Transition, khung hình bị tạm dừng (rAF không chạy).
 */
export function waitFor(check: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let round = 0;
    const test = () => {
      try {
        return check();
      } catch {
        return false;
      }
    };
    const settle = (v: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => settle(test()), timeoutMs);
    const tick = () => {
      if (settled) return;
      if (test()) return settle(true);
      const r = ++round;
      const fire = () => r === round && tick(); // lượt cũ (cái đến sau) bỏ qua
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(fire);
      setTimeout(fire, 16);
    };
    tick();
  });
}

/** Lần chuyển cảnh gần nhất: lần cũ bị lần mới thay thì không gỡ cờ của lần mới. */
let current = 0;

/**
 * Chạy một lần chuyển cảnh; `<html data-hero-morph>` trong lúc chạy (CSS tắt hiệu ứng mở popup riêng).
 * `update` trả false (popup không kịp hiện / biến mất trong hạn chờ) → bỏ phần bay, trả trang về ngay.
 */
function run(update: () => Promise<boolean>, cleanup: () => void) {
  const start = starter();
  const html = document.documentElement;
  const id = ++current;
  const done = () => {
    cleanup();
    if (id === current) html.removeAttribute("data-hero-morph");
  };
  html.setAttribute("data-hero-morph", "");
  let ok = true;
  const step = async () => {
    ok = await update();
  };
  let vt: HeroTransition;
  try {
    vt = start!(step);
  } catch {
    // Không chạy được chuyển cảnh: vẫn cập nhật trang, dọn tên/cờ SAU khi cập nhật xong
    // (morphClose gán tên cho thẻ trong lúc cập nhật — dọn trước thì tên kẹt lại, lần bay sau bị trùng tên).
    void update().finally(done);
    return;
  }
  // Lỗi của chuyển cảnh (bị bỏ qua, trùng tên…) không được thành lỗi chưa xử lý.
  vt.ready.catch(() => {});
  vt.updateCallbackDone.then(
    () => {
      if (!ok) vt.skipTransition();
    },
    () => {},
  );
  vt.finished.then(done, done);
}

/** Đang có ảnh bay (cờ `<html data-hero-morph>`). Máy chủ → false. */
export function isMorphing(): boolean {
  return (
    typeof document !== "undefined" && document.documentElement.hasAttribute("data-hero-morph")
  );
}

const popupImageShown = () => document.querySelector("dialog[open] [data-hero]") !== null;
const popupGone = () => document.querySelector("[data-testid=product-dialog]") === null;

/** Khung ảnh thẻ/dòng của SP `sku` đang nằm (ít nhất một phần) trong khung nhìn. */
function visibleSource(sku: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(
    `[data-hero-src][data-sku="${CSS.escape(sku)}"]`,
  );
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < window.innerHeight &&
      r.left < window.innerWidth
    )
      return el;
  }
  return null;
}

/** Mở popup: ảnh từ khung `source` bay tới ảnh trong popup. Gọi sau khi `canMorph(e)` = true. */
export function morphOpen(source: HTMLElement | null, navigate: () => void): void {
  if (source) source.style.viewTransitionName = HERO;
  run(
    async () => {
      // Ảnh chụp trạng thái cũ đã xong: gỡ tên để trạng thái mới chỉ có ảnh trong popup mang tên này.
      if (source) source.style.viewTransitionName = "";
      navigate();
      return waitFor(popupImageShown, HERO_TIMEOUT_MS);
    },
    () => {
      if (source) source.style.viewTransitionName = "";
    },
  );
}

/**
 * Đóng popup: ảnh trong popup bay về khung ảnh thẻ của SP đang xem.
 * Thẻ không có trên trang / ngoài khung nhìn (đã lướt sang SP khác) hoặc không bay được → `close()` thẳng.
 */
export function morphClose(sku: string, close: () => void): void {
  if (!sku || !canMorph() || !visibleSource(sku)) return close();
  let target: HTMLElement | null = null;
  run(
    async () => {
      close();
      const gone = await waitFor(popupGone, HERO_TIMEOUT_MS);
      // Popup còn (quá hạn) thì không gán tên: trùng tên với ảnh popup làm hỏng chuyển cảnh.
      if (!gone) return false;
      target = visibleSource(sku);
      if (target) target.style.viewTransitionName = HERO;
      return true;
    },
    () => {
      if (target) target.style.viewTransitionName = "";
    },
  );
}
