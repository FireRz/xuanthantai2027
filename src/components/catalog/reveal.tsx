"use client";

import { useEffect, useRef, useState } from "react";

/** Phần tử `li` hiện dần (trượt nhẹ lên) lần đầu cuộn tới; không chạy lại khi cuộn ngược. */
export function RevealItem({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className={`reveal ${className ?? ""}`}
      data-in={seen ? "" : undefined}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </li>
  );
}
