"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Nút nổi "Lên đầu trang" (hiện khi đã cuộn xuống quá một màn hình), tránh phải cuộn tay qua nhiều SP. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;
  return (
    <button
      type="button"
      data-testid="back-to-top"
      aria-label="Lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="bg-gold text-gold-fg hover:bg-gold-dark fixed right-4 bottom-4 z-30 flex size-12 items-center justify-center rounded-full shadow-lg hover:text-white md:right-6 md:bottom-6"
    >
      <ArrowUp className="size-6" aria-hidden />
    </button>
  );
}
