"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductNeighbors } from "@/server/services/product-neighbors";
import { useCatalogNav } from "./catalog-nav";

type Dir = "prev" | "next";

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

/**
 * Chuyển sang SP trước/sau trong popup (cả chế độ đầy đủ lẫn chế độ hình):
 * nút mũi tên hai bên ảnh, phím ←/→, vuốt ngang trên ảnh/khối thông tin (`data-swipe-area`).
 * Chuyển = `router.replace` (không thêm lịch sử) nên Back/✕ vẫn đóng popup một lần là xong.
 * Bỏ qua khi lớp phóng to ảnh đang mở; vuốt bắt đầu trên bảng SL theo cửa hàng là cuộn bảng.
 */
export function ProductSwipe({
  neighbors,
  children,
}: {
  neighbors: ProductNeighbors | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { state, hrefFor } = useCatalogNav();
  const [pending, startTransition] = useTransition();
  const [dir, setDir] = useState<Dir | null>(null);
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
  const urlFor = (sku: string) => hrefFor({ ...state, sp: sku });

  function go(d: Dir) {
    const target = d === "next" ? next : prev;
    if (!target) return;
    setDir(d);
    startTransition(() => router.replace(urlFor(target), { scroll: false }));
  }

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

  // Chỉ tải trước ảnh SP kế bên (không router.prefetch: trang force-dynamic, prefetch đầy đủ rất tốn).
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
    setOffset(0, true);
    if (e.type === "pointerup" && (Math.abs(dx) > SWIPE_PX || (fast && Math.abs(dx) > SLOP * 2)))
      go(dx < 0 ? "next" : "prev");
  }

  return (
    <Ctx.Provider value={{ neighbors, go }}>
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
          // SP mới → gắn lại để chạy hiệu ứng trượt vào từ phía tương ứng.
          key={neighbors?.position ?? 0}
          ref={contentRef}
          className={cn(
            "transition-opacity md:flex md:min-h-0 md:flex-1 md:flex-col",
            pending && "opacity-60",
            dir === "next" && "animate-in slide-in-from-right-8 duration-200",
            dir === "prev" && "animate-in slide-in-from-left-8 duration-200",
            "motion-reduce:animate-none",
          )}
        >
          {children}
        </div>
      </div>
    </Ctx.Provider>
  );
}

const navButton =
  "border-line text-ink absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-white/90 shadow-md hover:bg-white";

/** Nút tròn Sản phẩm trước/sau hai bên ảnh; ẩn phía không có SP. */
export function NeighborButtons({ children }: { children: React.ReactNode }) {
  const ctx = useContext(Ctx);
  return (
    <div className="relative">
      {children}
      {ctx?.neighbors?.prev && (
        <button
          type="button"
          aria-label="Sản phẩm trước"
          onClick={() => ctx.go("prev")}
          className={cn(navButton, "left-1")}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      )}
      {ctx?.neighbors?.next && (
        <button
          type="button"
          aria-label="Sản phẩm sau"
          onClick={() => ctx.go("next")}
          className={cn(navButton, "right-1")}
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Dòng "{vị trí} / {tổng}" cạnh mã SP; không thuộc danh sách đang lọc thì không hiện. */
export function NeighborPosition() {
  const n = useContext(Ctx)?.neighbors;
  if (!n) return null;
  return (
    <span data-testid="product-position" className="text-ink-muted text-sm tabular-nums">
      {formatInt(n.position)} / {formatInt(n.total)}
    </span>
  );
}
