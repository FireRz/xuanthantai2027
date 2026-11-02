import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/password";

export function assertPasswordPolicy(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new DomainError("WEAK_PASSWORD", `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`);
  }
}

/**
 * Tạo tài khoản quản trị (nếu chưa có) hoặc đặt lại mật khẩu, đồng thời gỡ khóa tạm.
 * Dùng cho script `npm run admin:set-password` — mật khẩu không bao giờ nằm trong mã nguồn.
 */
export async function setAdminPassword(
  username: string,
  password: string,
): Promise<{ created: boolean }> {
  assertPasswordPolicy(password);
  const passwordHash = await hashPassword(password);
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash, failedAttempts: 0, lockedUntil: null },
    });
    return { created: false };
  }
  // Chỉ một tài khoản quản trị (ADR-004 A2).
  if ((await prisma.adminUser.count()) > 0) {
    throw new DomainError("ADMIN_EXISTS", "Đã có tài khoản quản trị với tên đăng nhập khác");
  }
  await prisma.adminUser.create({ data: { username, passwordHash } });
  return { created: true };
}

/** Đổi mật khẩu từ trang /admin/account: phải nhập đúng mật khẩu hiện tại. */
export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new DomainError("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng");
  }
  assertPasswordPolicy(newPassword);
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { passwordHash: await hashPassword(newPassword), failedAttempts: 0, lockedUntil: null },
  });
}
