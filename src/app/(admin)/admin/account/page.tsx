import type { Metadata } from "next";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { requireAdminPage } from "@/server/auth/require-admin";
import { isViewerPasswordSet } from "@/server/auth/viewer-pass";
import { PasswordForm } from "./password-form";
import { ViewerPasswordForm } from "./viewer-password-form";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  const viewerSet = await isViewerPasswordSet();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tài khoản</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Đăng nhập với tên <strong>{admin.username}</strong>.
        </p>
      </div>
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-1 font-semibold">Đổi mật khẩu</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Tối thiểu {MIN_PASSWORD_LENGTH} ký tự. Sau khi đổi, bạn sẽ được đăng xuất và đăng nhập lại
          bằng mật khẩu mới.
        </p>
        <PasswordForm />
      </section>
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="mb-1 font-semibold">Mật khẩu xem phân tích</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Ai có mật khẩu này mở được trang /phan-tich trong 30 ngày. Đổi mật khẩu thì mọi người phải
          nhập lại.
        </p>
        <ViewerPasswordForm isSet={viewerSet} />
      </section>
    </div>
  );
}
