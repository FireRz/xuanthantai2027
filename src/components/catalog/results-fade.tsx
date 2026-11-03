"use client";

import { useCatalogNav } from "./catalog-nav";

/** Làm mờ danh sách cũ trong lúc đang tải kết quả mới (đổi bộ lọc, sắp xếp, Lưới/Bảng). */
export function ResultsFade({ children }: { children: React.ReactNode }) {
  const { pending } = useCatalogNav();
  return (
    <div
      id="ket-qua"
      aria-busy={pending}
      className={`transition-[opacity,filter] duration-200 motion-reduce:transition-none ${
        pending ? "pointer-events-none opacity-40 blur-[1px]" : ""
      }`}
    >
      {children}
    </div>
  );
}
