"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  VIEWER_COOKIE,
  VIEWER_COOKIE_MAX_AGE_S,
  verifyViewerPassword,
} from "@/server/auth/viewer-pass";

export interface ViewerLoginState {
  error?: string;
}

const HHMM = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Chỉ nhận chuỗi truy vấn của chính trang phân tích (rỗng hoặc bắt đầu bằng `?`), dựng lại qua
 * URLSearchParams để không lọt ký tự lạ — không bao giờ chuyển hướng sang đường dẫn khác.
 */
function safeQuery(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("?")) return "";
  const q = new URLSearchParams(next.slice(1)).toString();
  return q ? `?${q}` : "";
}

/** Nhận mật khẩu xem (P2, P4, P5): đúng thì đặt cookie `xtt_view` rồi quay lại đúng bộ lọc. */
export async function viewerLoginAction(
  _prev: ViewerLoginState,
  formData: FormData,
): Promise<ViewerLoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password === "") return { error: "Mật khẩu không đúng" };

  const result = await verifyViewerPassword(password);
  if (!result.ok) {
    if (result.reason === "locked") {
      return { error: `Tạm khóa, thử lại sau ${HHMM.format(result.lockedUntil)}` };
    }
    if (result.reason === "unset") return { error: "Trang phân tích chưa mở" };
    return { error: "Mật khẩu không đúng" };
  }

  (await cookies()).set(VIEWER_COOKIE, result.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VIEWER_COOKIE_MAX_AGE_S,
    path: "/",
  });
  redirect(`/phan-tich${safeQuery(formData.get("next"))}`);
}
