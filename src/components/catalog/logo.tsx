import Image from "next/image";

// Logo công ty bản trắng (docs/brand/logo-white.png, tạo từ logo-PNJ.png), nền trong suốt
// để đặt trực tiếp lên nền đỏ. Khi công ty cấp logo trắng chính thức thì thay file này.
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white.png"
      alt="PNJ"
      width={367}
      height={163}
      priority
      className={`h-10 w-auto shrink-0 drop-shadow-[0_1px_4px_rgb(120_10_10/0.6)] sm:h-12 ${className ?? ""}`}
    />
  );
}
