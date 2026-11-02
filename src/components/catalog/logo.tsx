import Image from "next/image";

// Logo công ty bản chữ trắng, nền trong suốt (docs/brand/logo-white.png, tách nền xanh từ
// "logo PNJ 2.jpg") để đặt thẳng lên nền đỏ.
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-white.png"
      alt="PNJ"
      width={535}
      height={221}
      priority
      className={`h-9 w-auto shrink-0 sm:h-11 ${className ?? ""}`}
    />
  );
}
