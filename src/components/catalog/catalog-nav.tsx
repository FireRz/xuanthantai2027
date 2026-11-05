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
  /** URL đầy đủ của trang hiện hành cho một trạng thái lọc: `path` + truy vấn + tham số giữ lại + neo. */
  hrefFor: (state: CatalogParams, hash?: string) => string;
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
  path = "/",
  keep = "",
  children,
}: {
  params: CatalogParams;
  /** Đường dẫn trang đang dựng URL: `"/"` (danh mục) hoặc `"/phan-tich"`. */
  path?: string;
  /** Truy vấn thêm luôn nối vào URL (không có `?`/`&` đầu), ví dụ `"nhom=line"`. */
  keep?: string;
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

  const hrefFor: CatalogNav["hrefFor"] = (s, hash = "") => {
    const q = buildCatalogQuery(s);
    const query = keep ? (q ? `${q}&${keep}` : `?${keep}`) : q;
    return `${path}${query}${hash}`;
  };

  const go: CatalogNav["go"] = (patch, opts = {}) => {
    let next: CatalogParams = { ...state, ...patch, n: PAGE_SIZE };
    // Đổi cửa hàng / khu vực thì bỏ công tắc "xem tất cả" của phạm vi cũ.
    if (patch.store !== undefined || patch.kv !== undefined) next.all = false;
    if (patch.brand !== undefined && opts.owned) {
      next = pruneInvalidSelections(next, opts.owned.lines, opts.owned.cols);
    }
    setState(next);
    const url = hrefFor(next, opts.hash);
    const scroll = Boolean(opts.hash);
    startTransition(() => {
      if (opts.mode === "push") router.push(url, { scroll });
      else router.replace(url, { scroll });
    });
  };

  return <Ctx.Provider value={{ state, go, hrefFor, pending }}>{children}</Ctx.Provider>;
}

export function useCatalogNav(): CatalogNav {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalogNav phải nằm trong CatalogNavProvider");
  return v;
}
