import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xuân Thần Tài 2027",
  description: "Bộ sưu tập trang sức mùa Xuân Thần Tài",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
