"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import type { ProductDetail } from "@/server/services/product-detail";
import type { ProductNeighbors } from "@/server/services/product-neighbors";
import { useCatalogNav } from "./catalog-nav";
import { DetailBody } from "./product-detail-body";
import { ProductDialog } from "./product-dialog";
import {
  NeighborProvider,
  ProductSwipe,
  SideNavButton,
  type Dir,
  type SwipeMotion,
} from "./product-swipe";
import { EDGE_MS, ENTER_MS, EXIT_MS, prefersReducedMotion } from "./swipe-motion";

export interface ProductView {
  detail: ProductDetail;
  neighbors: ProductNeighbors | null;
}

/** Dữ liệu tải sẵn quá thời gian này (ms) thì tải lại khi cần (số liệu có thể vừa được nhập). */
const FRESH_MS = 60_000;
/** Giữ tối đa bấy nhiêu SP đã tải trong bộ nhớ. */
const MAX_CACHED = 40;
/** Chờ thêm (ms) sau hiệu ứng rồi tự về đứng yên nếu trình duyệt không báo animationend. */
const SAFETY_MS = 150;
const IDLE: SwipeMotion = { phase: "idle", dir: "next" };

type Entry = { at: number; promise: Promise<ProductView | null>; data?: ProductView | null };
type Aim = Pick<Entry, "promise" | "data">;
const cache = new Map<string, Entry>();

function apiUrl(state: CatalogParams, sku: string) {
  return `/api/product-view${buildCatalogQuery({ ...state, sp: sku, n: undefined })}`;
}

/** Tải (hoặc lấy lại từ bộ nhớ) dữ liệu popup của một SP theo đúng bộ lọc đang xem. */
function load(url: string): Entry {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit;
  const entry: Entry = {
    at: Date.now(),
    promise: fetch(url, { cache: "no-store" }).then(async (r) => {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`product-view ${r.status}`);
      return (await r.json()) as ProductView;
    }),
  };
  entry.promise.then(
    (v) => (entry.data = v),
    () => cache.delete(url), // lỗi mạng: lần sau thử lại
  );
  cache.set(url, entry);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
  return entry;
}

/**
 * Popup SP có chuyển trước/sau ngay trên trình duyệt (không dựng lại cả trang):
 * lần mở đầu nhận dữ liệu từ máy chủ; SP trước/sau được tải sẵn ở chế độ nền nên vuốt/bấm hiện ngay.
 * Địa chỉ trang đổi theo SP đang xem bằng `history.replaceState` (không thêm lịch sử) —
 * link chia sẻ đúng SP và Back/✕ vẫn đóng popup một lần là xong.
 */
export function ProductViewer({ initial }: { initial: ProductView }) {
  const router = useRouter();
  const { state, hrefFor } = useCatalogNav();
  const [view, setView] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    // Máy chủ dựng lại popup (URL đổi từ nơi khác) → theo dữ liệu mới.
    setPrevInitial(initial);
    setView(initial);
  }
  const [motion, setMotion] = useState<SwipeMotion>(IDLE);
  const seq = useRef(0);
  /** SP đích của lần chuyển gần nhất (đang chạy hoặc đã xong): bấm tiếp tính từ SP này. */
  const aim = useRef<Aim>({ promise: Promise.resolve(initial), data: initial });
  /** Bấm khi dữ liệu SP đích chưa về (chưa biết SP kế tiếp của nó): xếp hàng, chạy lần lượt. */
  const queued = useRef<Dir[]>([]);
  /** Đang có lần chuyển chưa xong. */
  const busy = useRef(false);

  const { detail, neighbors } = view;

  // Máy chủ dựng lại popup → bấm tiếp tính từ SP mới. Đang chuyển dở thì để lần chuyển đó chạy nốt
  // (máy chủ có thể gửi lại dữ liệu của chính SP vừa mở ngay sau khi bấm).
  useEffect(() => {
    if (!busy.current) aim.current = { promise: Promise.resolve(initial), data: initial };
  }, [initial]);

  // Ghi dữ liệu đang xem vào bộ nhớ (quay lại SP vừa xem thì hiện ngay) và tải sẵn hai SP kế bên.
  useEffect(() => {
    const self = apiUrl(state, view.detail.sku);
    if (!cache.has(self))
      cache.set(self, { at: Date.now(), promise: Promise.resolve(view), data: view });
    for (const sku of [view.neighbors?.next, view.neighbors?.prev])
      if (sku) load(apiUrl(state, sku));
  }, [view, state]);

  function show(v: ProductView) {
    setView(v);
    window.history.replaceState(null, "", hrefFor({ ...state, sp: v.detail.sku }));
  }

  function fallback(sku: string) {
    // Không tải được qua API → điều hướng thường (máy chủ dựng lại trang).
    busy.current = false;
    queued.current = [];
    setMotion(IDLE);
    router.replace(hrefFor({ ...state, sp: sku }), { scroll: false });
  }

  /**
   * Chuyển SP: trượt ra (EXIT_MS) song song với tải dữ liệu; xong cả hai → hiện SP mới + trượt vào.
   * Dữ liệu chưa về khi trượt ra xong → `wait` (lớp ló ra của SP đích chiếm chỗ).
   * Bấm tiếp khi đang chuyển: bỏ hiệu ứng cũ (`seq`), SP đích tính từ SP đích đang tới
   * nên bấm nhanh liên tiếp không lùi. Giảm chuyển động → đổi ngay, không hiệu ứng.
   * Trả về false khi phía đó không có SP (không bắt đầu lần chuyển nào).
   */
  function go(d: Dir): boolean {
    const base = aim.current;
    if (base.data === undefined) {
      queued.current.push(d);
      return true;
    }
    const target = d === "next" ? base.data?.neighbors?.next : base.data?.neighbors?.prev;
    const reduced = prefersReducedMotion();
    if (!target) {
      // Hết SP phía đó: khung nảy nhẹ báo hết (không làm gián đoạn lần chuyển đang chạy).
      if (!busy.current && !reduced) {
        setMotion({ phase: "edge", dir: d });
        setTimeout(() => setMotion((m) => (m.phase === "edge" ? IDLE : m)), EDGE_MS + SAFETY_MS);
      }
      return false;
    }
    const token = ++seq.current;
    busy.current = true;
    const entry = load(apiUrl(state, target));
    aim.current = entry;
    let exited = reduced;
    let done = false;
    const finish = () => {
      if (done || token !== seq.current || !exited || entry.data === undefined) return;
      done = true;
      busy.current = false;
      if (!entry.data) return fallback(target);
      show(entry.data);
      if (reduced) return setMotion(IDLE);
      setMotion({ phase: "enter", dir: d });
      // Phòng khi không nhận được animationend: không để kẹt ở trạng thái đang trượt.
      setTimeout(
        () => setMotion((m) => (token === seq.current && m.phase === "enter" ? IDLE : m)),
        ENTER_MS + SAFETY_MS,
      );
    };
    if (!reduced) {
      setMotion({ phase: "exit", dir: d });
      setTimeout(() => {
        if (token !== seq.current) return;
        exited = true;
        if (entry.data === undefined) setMotion({ phase: "wait", dir: d });
        finish();
      }, EXIT_MS);
    }
    entry.promise.then(
      () => {
        // Có lần bấm đang chờ SP này → chạy tiếp luôn (không hiện SP trung gian).
        // Lần bấm chờ nào không đi được (hết SP / SP không còn) thì bỏ; không còn lần nào → hiện SP này.
        while (aim.current === entry && queued.current.length)
          if (go(queued.current.shift()!)) return;
        finish();
      },
      () => token === seq.current && fallback(target),
    );
    finish();
    return true;
  }

  return (
    <NeighborProvider neighbors={neighbors} go={go}>
      <ProductDialog
        title={detail.name ?? detail.sku}
        prev={<SideNavButton dir="prev" />}
        next={<SideNavButton dir="next" />}
      >
        <ProductSwipe
          contentKey={detail.sku}
          motion={motion}
          onMotionEnd={() =>
            setMotion((m) => (m.phase === "enter" || m.phase === "edge" ? IDLE : m))
          }
        >
          <DetailBody detail={detail} filterStore={state.store} photo={state.photo} />
        </ProductSwipe>
      </ProductDialog>
    </NeighborProvider>
  );
}
