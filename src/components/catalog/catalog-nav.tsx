"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition } from "react";
import {
  buildCatalogQuery,
  PAGE_SIZE,
  pruneInvalidSelections,
  type CatalogParams,
  type OwnedOption,
} from "@/lib/catalog-params";

/** Chuyển đổi một lựa chọn (thêm/bỏ) trong danh sách. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export interface GoOptions {
  /** `replace` (mặc định): không thêm mục vào lịch sử; `push`: thêm mục. */
  mode?: "replace" | "push";
  /** Neo cuộn sau khi điều hướng, ví dụ `#san-pham`. */
  hash?: string;
  /** Dòng/BST và nhãn sở hữu — đổi nhãn thì bỏ lựa chọn không còn hợp lệ (B3, T04.9). */
  owned?: { lines: OwnedOption[]; cols: OwnedOption[] };
}

interface CatalogNav {
  /** Trạng thái lọc hiện hành, đã tính cả lựa chọn vừa bấm mà máy chủ chưa trả về (lạc quan). */
  state: CatalogParams;
  go: (patch: Partial<CatalogParams>, opts?: GoOptions) => void;
  pending: boolean;
}

const Ctx = createContext<CatalogNav | null>(null);

/**
 * Một nguồn duy nhất cho trạng thái lọc trên URL (B9), dùng chung cho thanh cửa hàng/tìm mã và
 * thanh lọc để hai nơi không ghi đè lên nhau khi người dùng thao tác nhanh.
 * Mọi thay đổi bỏ phân trang ("tải thêm"); khi URL thật đổi thì đồng bộ lại.
 */
export function CatalogNavProvider({
  params,
  children,
}: {
  params: CatalogParams;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const key = buildCatalogQuery(params);
  const [state, setState] = useState(params);
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setState(params);
  }

  const go: CatalogNav["go"] = (patch, opts = {}) => {
    let next: CatalogParams = { ...state, ...patch, n: PAGE_SIZE };
    // Đổi cửa hàng thì bỏ công tắc "xem tất cả" của cửa hàng cũ.
    if (patch.store !== undefined) next.all = false;
    if (patch.brand !== undefined && opts.owned) {
      next = pruneInvalidSelections(next, opts.owned.lines, opts.owned.cols);
    }
    setState(next);
    const url = `/${buildCatalogQuery(next)}${opts.hash ?? ""}`;
    const scroll = Boolean(opts.hash);
    startTransition(() => {
      if (opts.mode === "push") router.push(url, { scroll });
      else router.replace(url, { scroll });
    });
  };

  return <Ctx.Provider value={{ state, go, pending }}>{children}</Ctx.Provider>;
}

export function useCatalogNav(): CatalogNav {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalogNav phải nằm trong CatalogNavProvider");
  return v;
}
