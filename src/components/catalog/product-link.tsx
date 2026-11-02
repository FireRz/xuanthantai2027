"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildCatalogQuery, type CatalogParams } from "@/lib/catalog-params";
import { useCatalogNav } from "./catalog-nav";

/**
 * Dấu vết "popup mở bằng cách bấm trong trang" (khác với mở thẳng từ link `?sp=`):
 * bấm → thêm một mục vào lịch sử nên đóng popup = quay lại (Back); mở thẳng từ link → thay URL.
 */
export const popupTrail = {
  openedInApp: false,
  trigger: null as HTMLElement | null,
};

function href(state: CatalogParams, sku: string) {
  return `/${buildCatalogQuery({ ...state, sp: sku })}`;
}

/** Liên kết mở popup chi tiết SP: giữ nguyên bộ lọc/sắp xếp/số SP đang tải, chỉ thêm `sp` (F05). */
export function ProductLink({
  sku,
  className,
  children,
}: {
  sku: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { state } = useCatalogNav();
  return (
    <Link
      href={href(state, sku)}
      scroll={false}
      prefetch={false}
      data-testid="product-link"
      onClick={(e) => {
        popupTrail.openedInApp = true;
        popupTrail.trigger = e.currentTarget;
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

/** Dòng của dạng Bảng: bấm vào bất kỳ chỗ nào trên dòng cũng mở popup (liên kết trong dòng vẫn dùng được bằng bàn phím). */
export function ClickableRow({
  sku,
  className,
  children,
}: {
  sku: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { state } = useCatalogNav();
  const router = useRouter();
  return (
    <tr
      data-testid="product-row"
      data-sku={sku}
      className={className}
      onClick={(e) => {
        // Liên kết bên trong tự xử lý việc bấm của nó.
        if ((e.target as HTMLElement).closest("a")) return;
        popupTrail.openedInApp = true;
        popupTrail.trigger = e.currentTarget.querySelector("a");
        router.push(href(state, sku), { scroll: false });
      }}
    >
      {children}
    </tr>
  );
}
