"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** Khóa cũ của gợi ý "Chỉ xem hình": giữ nguyên để người đã thấy không phải thấy lại. */
const PHOTO_HINT_KEY = "xtt-photo-hint-seen";
/** Mỗi bong bóng tự tắt sau (ms). */
const HINT_MS = 9000;
/** Nghỉ giữa hai bong bóng (ms), để người dùng kịp thao tác. */
const GAP_MS = 1200;
/** Chờ sau khi một vị trí sẵn sàng (ms): các vị trí cùng lúc tải xong đều kịp đăng ký, đúng thứ tự. */
const START_MS = 500;
/** Đang gõ hoặc tab đang ẩn thì thử lại sau (ms). */
const BUSY_RETRY_MS = 1500;

/** Thứ tự hiện lần lượt. Gợi ý trong popup không nằm ở đây: nó chỉ hiện khi popup mở. */
const QUEUE = ["store", "search", "photo", "view", "card"] as const;
export type HintId = (typeof QUEUE)[number] | "popup";

let active: HintId | null = null;
const ready = new Set<HintId>();
const listeners = new Set<() => void>();
let waitTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const storageKey = (id: HintId) => (id === "photo" ? PHOTO_HINT_KEY : `xtt-hint-${id}`);

function seen(id: HintId) {
  try {
    return localStorage.getItem(storageKey(id)) === "1";
  } catch {
    return true; // Trình duyệt chặn lưu trữ: không gợi ý, tránh hiện lại mỗi lần vào.
  }
}

function markSeen(id: HintId) {
  try {
    localStorage.setItem(storageKey(id), "1");
  } catch {
    // Không lưu được thì thôi.
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function isBusy() {
  const el = document.activeElement;
  return document.hidden || (el instanceof HTMLElement && el.matches("input, textarea, select"));
}

/** Popup đang mở thì chỉ xét gợi ý của popup; các gợi ý phía sau lớp nền mờ phải chờ. */
function nextHint(): HintId | null {
  if (ready.has("popup")) return seen("popup") ? null : "popup";
  return QUEUE.find((id) => ready.has(id) && !seen(id)) ?? null;
}

function schedule(ms: number) {
  clearTimeout(waitTimer);
  waitTimer = setTimeout(() => {
    if (active) return;
    const id = nextHint();
    if (!id) return;
    if (id !== "popup" && isBusy()) schedule(BUSY_RETRY_MS);
    else show(id);
  }, ms);
}

function show(id: HintId) {
  markSeen(id); // Đánh dấu ngay khi hiện: rời trang giữa chừng cũng không bị nhắc lại.
  active = id;
  emit();
  hideTimer = setTimeout(dismiss, HINT_MS);
  window.addEventListener("pointerdown", dismiss, { once: true });
}

function dismiss() {
  clearTimeout(hideTimer);
  window.removeEventListener("pointerdown", dismiss);
  active = null;
  emit();
  schedule(GAP_MS);
}

function setReady(id: HintId, on: boolean) {
  if (on) ready.add(id);
  else ready.delete(id);
  if (active && ((!on && active === id) || (on && id === "popup"))) dismiss();
  else schedule(START_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tắt bong bóng đang hiện nếu đúng là `id` (người dùng đã dùng đúng chức năng đó). */
export function dismissHint(id: HintId) {
  if (active === id) dismiss();
}

/**
 * Xếp hàng gợi ý lần đầu: `id` chỉ tới lượt khi `anchor` đang nằm trên màn hình và các gợi ý trước đã xong.
 * Trả về true khi tới lượt hiện. Máy chủ luôn trả false nên không lệch hydrate.
 */
export function useCoachHint(id: HintId, anchor: RefObject<Element | null>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const el = anchor.current;
    if (id === "popup") {
      setReady(id, true);
      return () => setReady(id, false);
    }
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Vị trí trong trang tính phần dưới thanh cửa hàng đang dính; vị trí trên thanh thì không.
    const rootMargin = id === "view" || id === "card" ? "-120px 0px 0px 0px" : "0px";
    const io = new IntersectionObserver(([e]) => setReady(id, Boolean(e?.isIntersecting)), {
      rootMargin,
      threshold: 0.5,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      setReady(id, false);
    };
  }, [id, anchor, enabled]);
  return useSyncExternalStore(
    subscribe,
    () => active === id,
    () => false,
  );
}

/** Khung bong bóng dùng chung; vị trí và mũi tên do nơi dùng quyết định. */
export const HINT_BUBBLE =
  "border-gold text-ink pointer-events-none absolute z-40 w-64 rounded-xl border bg-white px-3.5 py-2.5 text-[13px] leading-snug font-normal whitespace-normal shadow-lg";
const ARROW =
  "before:border-gold before:absolute before:-top-1.5 before:size-3 before:rotate-45 before:border-t before:border-l before:bg-white";

/**
 * Bong bóng gợi ý lần đầu (ADR-009 U20), gắn vào phần tử cha (cha cần `relative`).
 * Không nhận chuột nên không che nút bên dưới. Dùng thẻ span vì có thể nằm trong label hoặc đoạn chữ.
 */
export function CoachHint({
  id,
  title,
  children,
  enabled = true,
  arrow = "left",
  className,
}: {
  id: HintId;
  title: string;
  children: React.ReactNode;
  enabled?: boolean;
  /** Mũi tên hướng lên, sát trái hoặc phải bong bóng; `none` khi bong bóng nằm đè lên chính phần được gợi ý. */
  arrow?: "left" | "right" | "none";
  className?: string;
}) {
  const parent = useRef<Element | null>(null);
  const show = useCoachHint(id, parent, enabled);
  return (
    <>
      <span
        hidden
        ref={(el) => {
          parent.current = el?.parentElement ?? null;
        }}
      />
      {show && (
        <span
          role="tooltip"
          data-testid={`hint-${id}`}
          className={cn(
            HINT_BUBBLE,
            "animate-in fade-in block duration-200 motion-reduce:animate-none",
            arrow !== "none" && ARROW,
            arrow === "left" && "before:left-5",
            arrow === "right" && "before:right-5",
            className,
          )}
        >
          <b className="text-navy block font-semibold">{title}</b>
          {children}
        </span>
      )}
    </>
  );
}
