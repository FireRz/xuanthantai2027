import Image from "next/image";
import { SiteNav } from "./site-nav";

/**
 * Banner Tết (ADR-009 U4', U14', U18'): ảnh tranh Tết làm nền toàn banner, chữ căn giữa trên
 * phần nền đỏ trơn; chỉ còn nút dẫn xuống thanh "Cửa hàng của bạn". Viền lượn vàng ở đáy.
 */
export function Banner() {
  return (
    <header className="bg-brand relative overflow-hidden text-center text-white">
      <Image
        src="/brand/tet-banner.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <SiteNav />
      <div className="relative z-10 mx-auto max-w-2xl px-6 pt-8 pb-24 md:pt-14 md:pb-32">
        <p className="text-festive-text text-xs font-semibold tracking-[0.3em] uppercase md:text-sm">
          Xuân Đinh Mùi · 2027
        </p>
        <h1 className="font-display text-gold mt-3 text-[44px] leading-[1.05] font-bold md:text-[72px]">
          Xuân Thần Tài
        </h1>
        <p className="font-display text-festive-text mt-3 text-lg italic md:text-2xl">
          Vạn sự như ý — Tài lộc đầy nhà
        </p>
        <p className="text-festive-text mx-auto mt-4 hidden max-w-xl text-[15px] sm:block md:text-base">
          Theo dõi số lượng đặt và hàng đã về của bộ sưu tập trang sức mùa Xuân Thần Tài 2027, theo
          từng cửa hàng.
        </p>
        <a
          href="#cua-hang"
          className="bg-gold text-gold-fg mt-6 inline-flex min-h-11 items-center rounded-full px-6 font-semibold shadow-md hover:bg-white"
        >
          Chọn cửa hàng của bạn ↓
        </a>
      </div>
      <svg
        aria-hidden
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] z-10 h-6 w-full md:h-10"
      >
        <path
          d="M0 40V22C120 6 240 6 360 20s240 16 360 4 240-18 360-6 240 18 360 6V40Z"
          fill="#fbf6ec"
        />
        <path
          d="M0 22C120 6 240 6 360 20s240 16 360 4 240-18 360-6 240 18 360 6"
          fill="none"
          stroke="#f2a900"
          strokeWidth="3"
        />
      </svg>
    </header>
  );
}
