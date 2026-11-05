"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import type { ProductDetail } from "@/server/services/product-detail";
import type { ProductNeighbors } from "@/server/services/product-neighbors";
import { useCatalogNav } from "./catalog-nav";
import { DetailBody } from "./product-detail-body";
import { ProductDialog } from "./product-dialog";
import { NeighborProvider, ProductSwipe, SideNavButton, type Dir } from "./product-swipe";

export interface ProductView {
  detail: ProductDetail;
  neighbors: ProductNeighbors | null;
}

/** Dữ liệu tải sẵn quá thời gian này (ms) thì tải lại khi cần (số liệu có thể vừa được nhập). */
const FRESH_MS = 60_000;
/** Giữ tối đa bấy nhiêu SP đã tải trong bộ nhớ. */
const MAX_CACHED = 40;

type Entry = { at: number; promise: Promise<ProductView | null>; data?: ProductView | null };
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
  const [dir, setDir] = useState<Dir | null>(null);
  const [pending, setPending] = useState(false);
  const seq = useRef(0);

  const { detail, neighbors } = view;

  // Ghi dữ liệu đang xem vào bộ nhớ (quay lại SP vừa xem thì hiện ngay) và tải sẵn hai SP kế bên.
  useEffect(() => {
    const self = apiUrl(state, view.detail.sku);
    if (!cache.has(self))
      cache.set(self, { at: Date.now(), promise: Promise.resolve(view), data: view });
    for (const sku of [view.neighbors?.next, view.neighbors?.prev])
      if (sku) load(apiUrl(state, sku));
  }, [view, state]);

  function show(v: ProductView, d: Dir) {
    setDir(d);
    setPending(false);
    setView(v);
    window.history.replaceState(null, "", hrefFor({ ...state, sp: v.detail.sku }));
  }

  function go(d: Dir) {
    const target = d === "next" ? neighbors?.next : neighbors?.prev;
    if (!target) return;
    const token = ++seq.current;
    const entry = load(apiUrl(state, target));
    const fallback = () => {
      // Không tải được qua API → điều hướng thường (máy chủ dựng lại trang).
      setPending(false);
      router.replace(hrefFor({ ...state, sp: target }), { scroll: false });
    };
    if (entry.data) return show(entry.data, d);
    setPending(true);
    entry.promise.then(
      (v) => {
        if (token !== seq.current) return;
        if (v) show(v, d);
        else fallback();
      },
      () => token === seq.current && fallback(),
    );
  }

  return (
    <NeighborProvider neighbors={neighbors} go={go}>
      <ProductDialog
        title={detail.name ?? detail.sku}
        prev={<SideNavButton dir="prev" />}
        next={<SideNavButton dir="next" />}
      >
        <ProductSwipe contentKey={detail.sku} dir={dir} pending={pending}>
          <DetailBody detail={detail} filterStore={state.store} photo={state.photo} />
        </ProductSwipe>
      </ProductDialog>
    </NeighborProvider>
  );
}
