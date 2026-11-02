import Link from "next/link";
import { Logo } from "./logo";

/** Thanh điều hướng trên cùng của trang xem (nằm trên banner) — UI-DESIGN §5. */
export function SiteNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
    >
      <Link href="/" className="flex items-center gap-3 rounded-lg">
        <Logo />
        <span className="font-display text-[22px] leading-none font-bold text-white [text-shadow:0_1px_6px_rgb(120_10_10/0.7)] md:text-[28px]">
          Xuân Thần Tài 2027
        </span>
      </Link>
      <div className="text-festive-text hidden items-center gap-6 text-sm font-medium sm:flex">
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
