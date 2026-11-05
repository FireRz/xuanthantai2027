"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCatalogNav } from "./catalog-nav";
import { canMorph, morphOpen } from "./hero-transition";

/**
 * Dấu vết "popup mở bằng cách bấm trong trang" (khác với mở thẳng từ link `?sp=`):
 * bấm → thêm một mục vào lịch sử nên đóng popup = quay lại (Back); mở thẳng từ link → thay URL.
 */
export const popupTrail = {
  openedInApp: false,
  trigger: null as HTMLElement | null,
};

/** Khung ảnh của thẻ / dòng chứa phần tử được bấm (nguồn của ảnh bay vào popup). */
function heroSource(el: HTMLElement): HTMLElement | null {
  return (el.closest("[data-sku]") ?? el).querySelector<HTMLElement>("[data-hero-src]");
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
  const { state, hrefFor } = useCatalogNav();
  const router = useRouter();
  const href = hrefFor({ ...state, sp: sku });
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      data-testid="product-link"
      onClick={(e) => {
        popupTrail.openedInApp = true;
        popupTrail.trigger = e.currentTarget;
        // Bấm kèm phím (mở tab mới…), giảm chuyển động, trình duyệt cũ → để Link xử lý như thường.
        if (!canMorph(e)) return;
        e.preventDefault();
        morphOpen(heroSource(e.currentTarget), () => router.push(href, { scroll: false }));
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
  const { state, hrefFor } = useCatalogNav();
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
        const open = () => router.push(hrefFor({ ...state, sp: sku }), { scroll: false });
        if (canMorph(e)) morphOpen(heroSource(e.currentTarget), open);
        else open();
      }}
    >
      {children}
    </tr>
  );
}
