"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { formatInt } from "@/lib/format";
import type { ProductNeighbors } from "@/server/services/product-neighbors";
import { ProductImage } from "./product-image";
import { EDGE_MS, prefersReducedMotion, SLOP, SPRING, swipeDecision } from "./swipe-motion";

export type Dir = "prev" | "next";

/** Giai đoạn hiệu ứng lướt: trượt ra → (chờ dữ liệu) → trượt vào; `edge` = nảy báo hết SP. */
export type SwipeMotion = { phase: "idle" | "exit" | "wait" | "enter" | "edge"; dir: Dir };

const Ctx = createContext<{ neighbors: ProductNeighbors | null; go: (dir: Dir) => void } | null>(
  null,
);

const zoomOpen = () => document.querySelector("[data-testid=image-zoom][open]") !== null;

/** Giá trị `data-motion` (CSS ở globals.css chạy hiệu ứng theo nó); đứng yên → không có. */
function motionAttr({ phase, dir }: SwipeMotion) {
  if (phase === "idle") return undefined;
  // Chờ dữ liệu: giữ khung cuối của trượt ra (lớp ló ra của SP đích chiếm chỗ).
  return `${phase === "wait" ? "exit" : phase}-${dir}`;
}

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
 * Kiểu album: kéo tay thì nội dung đi theo ngón tay, ảnh SP kế bên ló ra sát mép (`swipe-peek`);
 * hiệu ứng trượt ra/vào/nảy chạy theo `motion` (ProductViewer sở hữu), xong thì báo `onMotionEnd`.
 * Bỏ qua khi lớp phóng to ảnh đang mở; vuốt bắt đầu trên bảng SL theo cửa hàng là cuộn bảng.
 */
export function ProductSwipe({
  contentKey,
  motion,
  onMotionEnd,
  children,
}: {
  /** Đổi khi sang SP khác → gắn lại nội dung để chạy hiệu ứng trượt vào. */
  contentKey: string;
  motion: SwipeMotion;
  onMotionEnd: () => void;
  children: React.ReactNode;
}) {
  const ctx = useContext(Ctx);
  const neighbors = ctx?.neighbors ?? null;
  const go = (d: Dir) => ctx?.go(d);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const suppressClick = useRef(false);
  /** Đang kéo tay về phía nào (để hiện lớp ló ra đúng phía). */
  const [dragDir, setDragDir] = useState<Dir | null>(null);

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

  /** Dịch nội dung theo ngón tay; `spring` = trả về bằng đường cong nảy (hủy vuốt). */
  function setOffset(dx: number, spring: boolean) {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = spring ? `transform ${EDGE_MS}ms ${SPRING}` : "";
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
    // Phía không có SP: kéo nặng tay (chỉ một phần ba quãng đường), không có gì ló ra.
    const blocked = (dx < 0 && !next) || (dx > 0 && !prev);
    setDragDir(blocked || !dx ? null : dx < 0 ? "next" : "prev");
    setOffset(blocked ? dx / 3 : dx, false);
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.axis !== "x") return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 300);
    const decision = swipeDecision({
      dx: e.clientX - d.x,
      dtMs: e.timeStamp - d.t,
      released: e.type === "pointerup",
      hasPrev: !!prev,
      hasNext: !!next,
    });
    if (decision === "next" || decision === "prev") {
      // Trượt ra tiếp từ chỗ ngón tay (không kéo về giữa trước); giảm chuyển động thì về chỗ ngay.
      if (prefersReducedMotion()) {
        setDragDir(null);
        setOffset(0, false);
      }
      go(decision);
    } else {
      // Hủy / hết SP phía đó: nảy về chỗ cũ.
      setDragDir(null);
      setOffset(0, !prefersReducedMotion());
    }
  }

  // Lớp ló ra: lúc kéo tay, và lúc trượt ra/chờ dữ liệu (chiếm chỗ SP cũ).
  const peekDir =
    motion.phase === "exit" || motion.phase === "wait"
      ? motion.dir
      : motion.phase === "idle"
        ? dragDir
        : null;
  const peekImage = peekDir === "next" ? nextImage : prevImage;

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
        ref={trackRef}
        data-testid="swipe-content"
        data-motion={motionAttr(motion)}
        onAnimationEnd={(e) => {
          // Chỉ hiệu ứng của chính khung lướt (bỏ qua hiệu ứng của ảnh/khối con).
          if (e.target === e.currentTarget) onMotionEnd();
        }}
        className="relative md:flex md:min-h-0 md:flex-1 md:flex-col"
      >
        {children}
        {peekDir && (
          <div
            aria-hidden
            data-testid="swipe-peek"
            data-dir={peekDir}
            className={
              peekDir === "next"
                ? "absolute inset-y-0 left-full w-full p-4 md:px-6 md:py-5"
                : "absolute inset-y-0 right-full w-full p-4 md:px-6 md:py-5"
            }
          >
            <ProductImage
              thumbUrl={peekImage}
              alt=""
              priority
              className="border-line aspect-square w-full max-w-[30vh] rounded-xl border md:w-[300px] md:max-w-none"
            />
          </div>
        )}
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
