"use server";

import { z } from "zod";
import { signOut } from "@/server/auth";
import { changeAdminPassword } from "@/server/auth/admin-account";
import { UnauthorizedError, requireAdmin } from "@/server/auth/require-admin";
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
