import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { LOCK_WINDOW_MS, verifyAdminLogin } from "@/server/auth/login";
import { resetDb } from "./helpers";

const PASSWORD = "mat-khau-thu-nghiem";

async function makeAdmin(username = "admin") {
  return prisma.adminUser.create({
    data: { username, passwordHash: await hashPassword(PASSWORD) },
  });
}

describe("verifyAdminLogin (T02.2)", () => {
  beforeEach(resetDb);

  it("đúng mật khẩu → ok", async () => {
    const admin = await makeAdmin();
    const r = await verifyAdminLogin("admin", PASSWORD);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.id).toBe(admin.id);
  });

  it("sai mật khẩu hoặc sai tên đăng nhập → invalid", async () => {
    await makeAdmin();
    expect(await verifyAdminLogin("admin", "sai")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyAdminLogin("khong-co", PASSWORD)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("tạm khóa khi sai nhiều lần (T02.7)", () => {
  beforeEach(resetDb);

  it("5 lần sai, lần thứ 6 bị chặn dù mật khẩu đúng", async () => {
    await makeAdmin();
    for (let i = 0; i < 5; i++) {
      expect(await verifyAdminLogin("admin", "sai")).toEqual({ ok: false, reason: "invalid" });
    }
    const sixth = await verifyAdminLogin("admin", PASSWORD);
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) expect(sixth.reason).toBe("locked");
  });

  it("4 lần sai rồi đúng → vào được và đếm lại từ 0", async () => {
    await makeAdmin();
    for (let i = 0; i < 4; i++) await verifyAdminLogin("admin", "sai");
    expect((await verifyAdminLogin("admin", PASSWORD)).ok).toBe(true);
    expect(
      (await prisma.adminUser.findUniqueOrThrow({ where: { username: "admin" } })).failedAttempts,
    ).toBe(0);
  });

  it("hết 15 phút khóa thì đăng nhập lại được", async () => {
    await makeAdmin();
    const t0 = new Date();
    for (let i = 0; i < 5; i++) await verifyAdminLogin("admin", "sai", t0);
    const later = new Date(t0.getTime() + LOCK_WINDOW_MS + 1000);
    expect((await verifyAdminLogin("admin", PASSWORD, later)).ok).toBe(true);
  });

  it("lần sai cũ hơn 15 phút không cộng dồn", async () => {
    await makeAdmin();
    const t0 = new Date();
    for (let i = 0; i < 4; i++) await verifyAdminLogin("admin", "sai", t0);
    const later = new Date(t0.getTime() + LOCK_WINDOW_MS + 1000);
    expect(await verifyAdminLogin("admin", "sai", later)).toEqual({ ok: false, reason: "invalid" });
    // vẫn còn lượt: chưa bị khóa sau 1 lần sai mới
    expect((await verifyAdminLogin("admin", PASSWORD, later)).ok).toBe(true);
  });
});
