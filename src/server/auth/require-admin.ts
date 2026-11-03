import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { passwordFingerprint } from "@/lib/password";
import { auth } from "./index";

export class UnauthorizedError extends DomainError {
  constructor() {
    super("UNAUTHORIZED", "Cần đăng nhập quản trị");
  }
}

export interface AdminIdentity {
  id: string;
  username: string;
}

/**
 * Cổng bảo vệ cho MỌI Server Action / Route Handler ghi và API cấp token upload (ADR-004 A3).
 * Kiểm tra ở server, không tin middleware: phiên phải còn khớp tài khoản và mật khẩu hiện tại
 * (đổi mật khẩu → phiên cũ bị từ chối). Ném UnauthorizedError nếu không hợp lệ.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !session.fingerprint) throw new UnauthorizedError();
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, username: true, passwordHash: true },
  });
  if (!user || passwordFingerprint(user.passwordHash) !== session.fingerprint) {
    throw new UnauthorizedError();
  }
  return { id: user.id, username: user.username };
}

/**
 * Dùng trong trang/layout quản trị: chưa hợp lệ thì chuyển về /login.
 * Bọc cache để layout và page trong cùng một request chỉ kiểm tra (và truy vấn DB) một lần.
 */
export const requireAdminPage = cache(async (): Promise<AdminIdentity> => {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    throw e;
  }
});

/** Phản hồi 401 chuẩn cho Route Handler. */
export function unauthorizedResponse(): Response {
  return Response.json(
    { error: "UNAUTHORIZED", message: "Cần đăng nhập quản trị" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
