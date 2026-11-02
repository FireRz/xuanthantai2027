import Link from "next/link";
import { Logo } from "./logo";

/** Thanh điều hướng trên cùng của trang xem (nằm trên banner) — UI-DESIGN §5. */
export function SiteNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
    >
      <Link href="/" aria-label="Xuân Thần Tài 2027 — về đầu trang" className="rounded-lg">
        <Logo />
      </Link>
      <div className="text-festive-text hidden items-center gap-2 text-sm font-medium sm:flex">
        <a
          href="#bo-suu-tap"
          className="bg-brand-dark/70 hover:bg-brand-dark rounded-full px-3 py-1.5 hover:text-white"
        >
          Bộ sưu tập
        </a>
        <a
          href="#san-pham"
          className="bg-brand-dark/70 hover:bg-brand-dark rounded-full px-3 py-1.5 hover:text-white"
        >
          Sản phẩm
        </a>
      </div>
    </nav>
  );
}
