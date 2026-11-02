"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  buildCatalogQuery,
  PAGE_SIZE,
  pruneInvalidSelections,
  type CatalogParams,
  type OwnedOption,
} from "@/lib/catalog-params";

/** Bộ lọc nhóm — chuyển đổi một lựa chọn (thêm/bỏ) trong danh sách. */
export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export interface CatalogNavOptions {
  /** Dòng/BST và nhãn sở hữu — để đổi nhãn thì bỏ lựa chọn không còn hợp lệ (B3, T04.9). */
  lines?: OwnedOption[];
  cols?: OwnedOption[];
  /** `replace` (mặc định): đổi bộ lọc không thêm mục vào lịch sử; `push`: thêm mục. */
  mode?: "replace" | "push";
}

/**
 * Trạng thái lọc trên URL (B9). `state` phản ánh ngay lựa chọn vừa bấm (lạc quan) trong lúc máy chủ
 * dựng lại trang; khi URL thật đổi thì đồng bộ lại. Mọi thay đổi đều bỏ phân trang ("tải thêm").
 */
export function useCatalogNav(params: CatalogParams, opts: CatalogNavOptions = {}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const key = buildCatalogQuery(params);
  const [state, setState] = useState(params);
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setState(params);
  }

  const go = (patch: Partial<CatalogParams>) => {
    let next: CatalogParams = { ...state, ...patch, n: PAGE_SIZE };
    if (patch.store !== undefined) next.all = false;
    if (patch.brand !== undefined && opts.lines && opts.cols) {
      next = pruneInvalidSelections(next, opts.lines, opts.cols);
    }
    setState(next);
    const url = `/${buildCatalogQuery(next)}`;
    startTransition(() => {
      if (opts.mode === "push") router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    });
  };

  return { state, go, pending };
}
