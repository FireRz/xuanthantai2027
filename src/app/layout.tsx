import type { Metadata } from "next";
import { beVietnam, playfair } from "@/lib/fonts";
import { BRANCH_SHORT } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: `Xuân Thần Tài · ${BRANCH_SHORT}`,
  description: "Bộ sưu tập trang sức mùa Xuân Thần Tài",
  // Không cho công cụ tìm kiếm lập chỉ mục bất kỳ trang nào (ADR-005 I6).
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${playfair.variable} ${beVietnam.variable} antialiased`}>{children}</body>
    </html>
  );
}
