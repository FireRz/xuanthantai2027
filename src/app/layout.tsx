import type { Metadata } from "next";
import { beVietnam, playfair } from "@/lib/fonts";
import { BRANCH_SHORT } from "@/lib/site";
import "./globals.css";

const title = `Xuân Thần Tài · ${BRANCH_SHORT}`;
const description = "Bộ sưu tập trang sức mùa Xuân Thần Tài";

export const metadata: Metadata = {
  title,
  description,
  // Thông tin khi gửi link qua Teams, Zalo...; ảnh lấy từ `opengraph-image.jpg` cùng thư mục (ADR-009 U21).
  openGraph: { type: "website", locale: "vi_VN", siteName: "Xuân Thần Tài", title, description },
  twitter: { card: "summary_large_image", title, description },
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
