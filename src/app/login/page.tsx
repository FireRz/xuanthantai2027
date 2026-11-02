import type { Metadata } from "next";
import { adminFont } from "@/components/admin/admin-font";
import { AdminLogo } from "@/components/admin/admin-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; changed?: string }>;
}) {
  const { callbackUrl, changed } = await searchParams;
  // callbackUrl do middleware thêm vào có thể là URL đầy đủ; chỉ giữ phần đường dẫn.
  let next = "/admin";
  if (callbackUrl) {
    try {
      next = new URL(callbackUrl, "http://localhost").pathname;
    } catch {
      /* dùng mặc định */
    }
  }
  return (
    <main
      className={`${adminFont.className} flex min-h-dvh items-center justify-center bg-[#F7F7F5] px-4 py-10 text-neutral-900`}
    >
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <AdminLogo />
          <div>
            <h1 className="text-lg font-semibold">Quản trị</h1>
            <p className="text-sm text-neutral-500">Xuân Thần Tài 2027</p>
          </div>
        </div>
        <LoginForm
          next={next}
          notice={changed ? "Đã đổi mật khẩu. Vui lòng đăng nhập lại." : undefined}
        />
      </div>
    </main>
  );
}
