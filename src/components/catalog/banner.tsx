import Image from "next/image";

/**
 * Banner Tết (ADR-009 U4', U14', U18'): ảnh tranh Tết làm nền toàn banner, chữ căn giữa trên
 * phần nền đỏ trơn; Viền lượn vàng ở đáy.
 */
export function Banner() {
  return (
    <header className="relative flex aspect-[2400/900] w-full flex-col overflow-hidden bg-[#cc1208] text-center text-white sm:aspect-auto sm:min-h-[420px] lg:aspect-[2400/900] lg:max-h-[640px] lg:min-h-0">
      {/* Tranh ngang (docs/brand/tet-banner-2400.png) phủ kín banner; điện thoại thu nhỏ đúng tỉ lệ 2400:900 (chữ co theo chiều rộng). */}
      <Image
        src="/brand/tet-banner-2400.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        aria-hidden
        className="from-brand-dark/70 absolute inset-0 bg-gradient-to-b via-transparent to-transparent sm:hidden"
      />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-6 pt-0 pb-4 sm:pb-16">
        <h1 className="anim-rise font-display text-gold text-[6.4vw] leading-[1.1] font-bold whitespace-nowrap [text-shadow:0_2px_12px_rgb(90_5_5/0.7)] sm:text-[30px] md:text-[72px]">
          Xuân Đinh Mùi · 2027
        </h1>
        <p
          style={{ "--d": "150ms" } as React.CSSProperties}
          className="anim-rise font-display text-festive-text mt-[0.5vw] text-[3.4vw] italic [text-shadow:0_1px_8px_rgb(90_5_5/0.8)] sm:mt-3 sm:text-lg md:text-2xl"
        >
          Khởi vận hanh thông - tài lộc như ý
        </p>
        <p className="text-festive-text mx-auto mt-4 hidden max-w-2xl text-[15px] md:text-base lg:block">
          Theo dõi số lượng đặt và hàng đã về của các bộ sưu tập Xuân Thần Tài
        </p>
      </div>
      <svg
        aria-hidden
        viewBox="0 0 1440 40"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] z-10 h-2 w-full sm:h-6 md:h-10"
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
