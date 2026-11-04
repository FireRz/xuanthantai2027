"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signOut } from "@/server/auth";
import { changeAdminPassword } from "@/server/auth/admin-account";
import { UnauthorizedError, requireAdmin } from "@/server/auth/require-admin";
import { clearViewerPassword, setViewerPassword } from "@/server/auth/viewer-pass";
import { DomainError } from "@/server/errors";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export interface ChangePasswordState {
  error?: string;
}

const schema = z
  .object({
    current: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Hai lần nhập mật khẩu mới không khớp",
  });

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    throw e;
  }

  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await changeAdminPassword(admin.id, parsed.data.current, parsed.data.next);
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    throw e;
  }
  // Mật khẩu đổi → phiên hiện tại cũng hết hiệu lực; đăng nhập lại bằng mật khẩu mới.
  await signOut({ redirectTo: "/login?changed=1" });
  return {};
}

export interface ViewerPasswordState {
  ok: boolean;
  message: string;
}

/** Đặt hoặc đổi mật khẩu xem /phan-tich. Không phải admin → UnauthorizedError (không đổi gì). */
export async function setViewerPasswordAction(
  _prev: ViewerPasswordState,
  formData: FormData,
): Promise<ViewerPasswordState> {
  await requireAdmin();
  const password = formData.get("password");
  if (typeof password !== "string") return { ok: false, message: "Vui lòng nhập mật khẩu xem" };
  try {
    await setViewerPassword(password);
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/admin/account");
  return { ok: true, message: "Đã lưu mật khẩu xem" };
}

/** Tắt trang phân tích: xóa mật khẩu xem, mọi cookie đang có hết hiệu lực. */
export async function clearViewerPasswordAction(): Promise<ViewerPasswordState> {
  await requireAdmin();
  await clearViewerPassword();
  revalidatePath("/admin/account");
  return { ok: true, message: "Đã tắt trang phân tích" };
}
