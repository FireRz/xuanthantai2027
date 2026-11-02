"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/server/auth";

export interface LoginState {
  error?: string;
}

/** Chỉ cho quay lại đúng đường dẫn nội bộ trong /admin (chống chuyển hướng ra ngoài). */
function safeRedirect(next: FormDataEntryValue | null): string {
  return typeof next === "string" && /^\/admin(\/|$)/.test(next) ? next : "/admin";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: safeRedirect(formData.get("next")),
    });
  } catch (e) {
    if (e instanceof CredentialsSignin && e.code === "locked") {
      return { error: "Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút." };
    }
    if (e instanceof AuthError) return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
    throw e; // gồm cả NEXT_REDIRECT khi đăng nhập thành công
  }
  return {};
}
