import type { Metadata } from "next";
import Link from "next/link";
import { adminFont } from "@/components/admin/admin-font";
import { AdminLogo } from "@/components/admin/admin-logo";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/server/auth/require-admin";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: { default: "Quản trị", template: "%s — Quản trị" } };

// Mục trong sidebar (UI-DESIGN §8). Mục chưa có trang hiển thị mờ, bật dần theo từng phiên.
const NAV: { href: string; label: string; ready: boolean }[] = [
  { href: "/admin/master-data", label: "Danh mục", ready: true },
  { href: "/admin/products", label: "Sản phẩm", ready: true },
  { href: "/admin/images", label: "Ảnh", ready: true },
  { href: "/admin/import", label: "Nhập Excel", ready: true },
  { href: "/admin/quantities", label: "Số lượng", ready: true },
  { href: "/admin/export", label: "Xuất dữ liệu", ready: false },
  { href: "/admin/account", label: "Tài khoản", ready: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Kiểm tra ở server (không chỉ dựa vào middleware) — ADR-004 A3.
  const admin = await requireAdminPage();
  return (
    <div className={`${adminFont.className} min-h-dvh bg-[#F7F7F5] text-neutral-900`}>
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <Link href="/admin" className="flex items-center gap-3">
          <AdminLogo />
          <span className="font-semibold">Quản trị</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-neutral-500 sm:inline">{admin.username}</span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Đăng xuất
            </Button>
          </form>
        </div>
      </header>
      <div className="md:flex">
        <nav
          aria-label="Menu quản trị"
          className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white p-2 md:min-h-[calc(100dvh-3.5rem)] md:w-56 md:flex-col md:border-r md:border-b-0"
        >
          {NAV.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap hover:bg-neutral-100"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.href}
                aria-disabled="true"
                title="Sắp có"
                className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-neutral-400"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
