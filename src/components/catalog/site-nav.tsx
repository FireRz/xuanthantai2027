import Link from "next/link";
import { Logo } from "./logo";

/** Thanh điều hướng trên cùng của trang xem (logo ở góc trái, nằm trên banner) — UI-DESIGN §5. */
export function SiteNav() {
  return (
    <nav
      aria-label="Điều hướng chính"
      className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
    >
      <Link href="/" aria-label="Về đầu trang" className="rounded-lg">
        <Logo />
      </Link>
    </nav>
  );
}
