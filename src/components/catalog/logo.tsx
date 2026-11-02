import Image from "next/image";

// Logo công ty (docs/brand/ → public/brand/). Chưa có bản trắng nên đặt trong ô trắng bo góc
// để đọc được trên nền đỏ; khi có logo-white sẽ bỏ ô trắng.
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center rounded-lg bg-white px-2 py-1 shadow-sm ${className ?? ""}`}
    >
      <Image
        src="/brand/logo-PNJ.png"
        alt="PNJ"
        width={600}
        height={200}
        priority
        className="h-8 w-auto sm:h-9"
      />
    </span>
  );
}
