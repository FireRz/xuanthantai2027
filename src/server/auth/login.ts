import { prisma } from "@/server/db";
import { DUMMY_HASH, passwordFingerprint, verifyPassword } from "@/lib/password";

/** Khóa tạm sau 5 lần sai liên tiếp trong 15 phút *(mặc định kỹ thuật, T02.7)*. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_WINDOW_MS = 15 * 60_000;

export type LoginResult =
  | { ok: true; user: { id: string; username: string; fingerprint: string } }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; lockedUntil: Date };

/**
 * Kiểm tra đăng nhập quản trị. Đang khóa thì không kiểm tra mật khẩu (kể cả đúng).
 * `updatedAt` của tài khoản = lần sai gần nhất: cách quá 15 phút thì đếm lại từ đầu.
 */
export async function verifyAdminLogin(
  username: string,
  password: string,
  now: Date = new Date(),
): Promise<LoginResult> {
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) {
    await verifyPassword(password, DUMMY_HASH); // cân bằng thời gian trả lời
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, reason: "locked", lockedUntil: user.lockedUntil };
  }

  if (await verifyPassword(password, user.passwordHash)) {
    if (user.failedAttempts !== 0 || user.lockedUntil) {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }
    return {
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        fingerprint: passwordFingerprint(user.passwordHash),
      },
    };
  }

  const stale =
    user.failedAttempts > 0 && now.getTime() - user.updatedAt.getTime() > LOCK_WINDOW_MS;
  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: stale ? { failedAttempts: 1, lockedUntil: null } : { failedAttempts: { increment: 1 } },
  });
  if (updated.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lockedUntil: new Date(now.getTime() + LOCK_WINDOW_MS) },
    });
  }
  return { ok: false, reason: "invalid" };
}
