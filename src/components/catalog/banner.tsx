import Image from "next/image";
import { SiteNav } from "./site-nav";

/**
 * Banner Tết (ADR-009 U4', U14', U18'): ảnh tranh Tết làm nền toàn banner, chữ căn giữa trên
 * phần nền đỏ trơn; chỉ còn nút dẫn xuống thanh "Cửa hàng của bạn". Viền lượn vàng ở đáy.
 */
export function Banner() {
  return (
    <header className="relative flex min-h-[560px] flex-col overflow-hidden bg-[#cc1208] text-center text-white sm:min-h-[420px] lg:aspect-[2048/768] lg:max-h-[640px] lg:min-h-0">
      {/* Tranh ngang (docs/brand/tet-banner-wide.png) phủ kín banner; điện thoại/tablet neo góc dưới-trái để thấy con dê. */}
      <Image
        src="/brand/tet-banner-wide.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[left_bottom] lg:object-center"
      />
      <SiteNav />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-1 flex-col items-center justify-start px-6 pt-24 pb-24 sm:justify-center sm:pt-0 sm:pb-16">
        <h1 className="font-display text-gold text-[30px] leading-[1.1] font-bold whitespace-nowrap [text-shadow:0_2px_12px_rgb(90_5_5/0.7)] md:text-[72px]">
          Xuân Đinh Mùi · 2027
        </h1>
        <p className="font-display text-festive-text mt-3 text-lg italic [text-shadow:0_1px_8px_rgb(90_5_5/0.8)] md:text-2xl">
          Vạn sự như ý — Tài lộc đầy nhà
        </p>
        <p className="text-festive-text mx-auto mt-4 hidden max-w-xl text-[15px] md:text-base lg:block">
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
