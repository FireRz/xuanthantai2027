import Image from "next/image";

// Logo công ty bản màu (docs/brand/logo-PNJ.png) cho nền trắng của trang quản trị và đăng nhập.
export function AdminLogo() {
  return (
    <Image
      src="/brand/logo-PNJ.png"
      alt="PNJ"
      width={600}
      height={209}
      priority
      className="h-9 w-auto shrink-0"
    />
  );
}
