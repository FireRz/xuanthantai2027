"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useRef } from "react";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductNeighbors } from "@/server/services/product-neighbors";

export type Dir = "prev" | "next";

const Ctx = createContext<{ neighbors: ProductNeighbors | null; go: (dir: Dir) => void } | null>(
  null,
);

/** Vuốt ngang quá ngưỡng này (px) khi thả tay thì chuyển SP. */
const SWIPE_PX = 60;
/** Vuốt nhanh (px/ms) thì chuyển dù chưa tới ngưỡng. */
const FLICK_SPEED = 0.5;
/** Di chuyển tối thiểu (px) trước khi quyết định vuốt ngang hay cuộn dọc. */
const SLOP = 10;

const zoomOpen = () => document.querySelector("[data-testid=image-zoom][open]") !== null;

/** Cung cấp SP trước/sau + hàm chuyển cho nút hai bên popup và mũi tên cạnh số thứ tự. */
export function NeighborProvider({
  neighbors,
  go,
  children,
}: {
  neighbors: ProductNeighbors | null;
  go: (dir: Dir) => void;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={{ neighbors, go }}>{children}</Ctx.Provider>;
}

/**
 * Vùng vuốt sang SP trước/sau trong popup (cả chế độ đầy đủ lẫn chế độ hình): phím ←/→,
 * vuốt ngang trên ảnh/khối thông tin (`data-swipe-area`). Việc tải và đổi SP do ProductViewer lo.
 * Bỏ qua khi lớp phóng to ảnh đang mở; vuốt bắt đầu trên bảng SL theo cửa hàng là cuộn bảng.
 */
export function ProductSwipe({
  contentKey,
  dir,
  pending,
  children,
}: {
  /** Đổi khi sang SP khác → gắn lại nội dung để chạy hiệu ứng trượt vào. */
  contentKey: string;
  dir: Dir | null;
  pending: boolean;
  children: React.ReactNode;
}) {
  const ctx = useContext(Ctx);
  const neighbors = ctx?.neighbors ?? null;
  const go = (d: Dir) => ctx?.go(d);
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const suppressClick = useRef(false);

  const prev = neighbors?.prev ?? null;
  const next = neighbors?.next ?? null;

  // Phím ←/→ khi popup mở (lớp phóng to ảnh không mở).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (zoomOpen()) return;
      // Đang đứng ở bảng SL theo cửa hàng (cuộn ngang được) → để phím cuộn bảng.
      const t = e.target;
      if (
        t instanceof Element &&
        (t.closest("[data-testid=store-qty-table]") ||
          t.querySelector(":scope > [data-testid=store-qty-table]"))
      )
        return;
      e.preventDefault();
      go(e.key === "ArrowRight" ? "next" : "prev");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Tải trước ảnh SP kế bên để ảnh hiện ngay khi chuyển.
  const prevImage = neighbors?.prevImage ?? null;
  const nextImage = neighbors?.nextImage ?? null;
  useEffect(() => {
    for (const src of [prevImage, nextImage]) if (src) new Image().src = src;
  }, [prevImage, nextImage]);

  function setOffset(dx: number, animate: boolean) {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms ease-out" : "";
    el.style.transform = dx ? `translateX(${dx}px)` : "";
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Chuột: dùng nút mũi tên/phím (kéo chuột dễ nhầm với bôi chọn chữ).
    if (!neighbors || e.pointerType === "mouse" || !e.isPrimary) return;
    const t = e.target as HTMLElement;
    if (!t.closest("[data-swipe-area]")) return;
    if (t.closest("[data-testid=store-qty-table], [data-testid=image-zoom]") || zoomOpen()) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, axis: null };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.axis === null) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      // Dọc nhiều hơn ngang → coi là cuộn, để trình duyệt xử lý.
      d.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      if (d.axis === "y") {
        drag.current = null;
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // Phía không có SP: kéo nặng tay (chỉ một phần ba quãng đường).
    const blocked = (dx < 0 && !next) || (dx > 0 && !prev);
    setOffset(blocked ? dx / 3 : dx, false);
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.axis !== "x") return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 300);
    const dx = e.clientX - d.x;
    const fast = Math.abs(dx) / Math.max(e.timeStamp - d.t, 1) > FLICK_SPEED;
    const switching =
      e.type === "pointerup" && (Math.abs(dx) > SWIPE_PX || (fast && Math.abs(dx) > SLOP * 2));
    const target = dx < 0 ? next : prev;
    // Chuyển được: nội dung mới trượt vào từ đúng phía nên không cần kéo ngược về giữa trước.
    if (switching && target) {
      setOffset(0, false);
      go(dx < 0 ? "next" : "prev");
    } else setOffset(0, true);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(e) => {
        // Vừa vuốt xong: không coi là bấm ảnh (mở phóng to).
        if (!suppressClick.current) return;
        suppressClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      className="overflow-x-clip md:flex md:min-h-0 md:flex-1 md:flex-col"
    >
      <div
        key={contentKey}
        ref={contentRef}
        className={cn(
          "transition-opacity md:flex md:min-h-0 md:flex-1 md:flex-col",
          pending && "opacity-60",
          dir === "next" && "animate-in slide-in-from-right-8 fade-in-60 duration-200",
          dir === "prev" && "animate-in slide-in-from-left-8 fade-in-60 duration-200",
          "motion-reduce:animate-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Nút tròn Sản phẩm trước/sau — máy tính: nằm hai bên NGOÀI khung popup (không che ảnh).
 * Phía không có SP vẫn giữ chỗ (ô trống) để khung popup luôn đứng giữa.
 */
export function SideNavButton({ dir }: { dir: Dir }) {
  const ctx = useContext(Ctx);
  const target = dir === "next" ? ctx?.neighbors?.next : ctx?.neighbors?.prev;
  if (!ctx || !target) return <span aria-hidden className="size-12 shrink-0 max-md:hidden" />;
  const Icon = dir === "next" ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      aria-label={dir === "next" ? "Sản phẩm sau" : "Sản phẩm trước"}
      onClick={() => ctx.go(dir)}
      className="text-ink focus-visible:outline-gold flex size-12 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-lg transition hover:scale-105 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 max-md:hidden"
    >
      <Icon className="size-7" aria-hidden />
    </button>
  );
}

const miniButton =
  "text-ink-muted hover:bg-gold-soft hover:text-ink flex size-10 items-center justify-center rounded-full disabled:opacity-30 md:hidden";

/**
 * Dòng "‹ {vị trí} / {tổng} ›" cạnh mã SP; mũi tên chỉ hiện trên điện thoại (máy tính đã có nút hai bên).
 * SP không thuộc danh sách đang lọc thì không hiện.
 */
export function NeighborPosition() {
  const ctx = useContext(Ctx);
  const n = ctx?.neighbors;
  if (!ctx || !n) return null;
  return (
    <span className="-my-2 flex shrink-0 items-center">
      {n.prev && (
        <button
          type="button"
          aria-label="Sản phẩm trước"
          onClick={() => ctx.go("prev")}
          className={miniButton}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      <span data-testid="product-position" className="text-ink-muted text-sm tabular-nums">
        {formatInt(n.position)} / {formatInt(n.total)}
      </span>
      {n.next && (
        <button
          type="button"
          aria-label="Sản phẩm sau"
          onClick={() => ctx.go("next")}
          className={miniButton}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </span>
  );
}
