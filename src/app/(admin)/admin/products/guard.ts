import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UnauthorizedError, requireAdmin } from "@/server/auth/require-admin";
import { DomainError } from "@/server/errors";

export type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/** Cổng chung: requireAdmin() ở server (ADR-004 A3), lỗi nghiệp vụ → thông báo cho UI. */
export async function guarded<T>(run: () => Promise<T>): Promise<Result<T>> {
  try {
    await requireAdmin();
    const data = await run();
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true, data };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    }
    if (e instanceof DomainError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "Dữ liệu gửi lên không hợp lệ" };
    throw e;
  }
}
