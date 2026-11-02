import { execFileSync } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { setAdminPassword } from "@/server/auth/admin-account";
import { verifyAdminLogin } from "@/server/auth/login";
import { resetDb } from "./helpers";

const PW1 = "mat-khau-thu-nghiem-1";
const PW2 = "mat-khau-thu-nghiem-2";

describe("setAdminPassword (T02.5)", () => {
  beforeEach(resetDb);

  it("tạo mới rồi đăng nhập được; đặt lại thì mật khẩu cũ hết hiệu lực và gỡ khóa", async () => {
    expect(await setAdminPassword("admin", PW1)).toEqual({ created: true });
    expect((await verifyAdminLogin("admin", PW1)).ok).toBe(true);

    for (let i = 0; i < 5; i++) await verifyAdminLogin("admin", "sai");
    expect((await verifyAdminLogin("admin", PW1)).ok).toBe(false); // đang khóa

    expect(await setAdminPassword("admin", PW2)).toEqual({ created: false });
    expect((await verifyAdminLogin("admin", PW1)).ok).toBe(false);
    expect((await verifyAdminLogin("admin", PW2)).ok).toBe(true);
  });

  it("từ chối mật khẩu ngắn và không tạo tài khoản thứ hai", async () => {
    await expect(setAdminPassword("admin", "ngan")).rejects.toMatchObject({
      code: "WEAK_PASSWORD",
    });
    await prisma.adminUser.create({
      data: { username: "admin", passwordHash: await hashPassword(PW1) },
    });
    await expect(setAdminPassword("nguoi-khac", PW2)).rejects.toMatchObject({
      code: "ADMIN_EXISTS",
    });
  });

  it("script npm run admin:set-password: chạy xong đăng nhập được bằng mật khẩu mới", async () => {
    const env = { ...process.env, ADMIN_PASSWORD: PW2, ADMIN_USERNAME: "admin" };
    const out = execFileSync("npx", ["tsx", "scripts/set-admin-password.ts"], {
      env,
      encoding: "utf8",
      shell: true,
    });
    expect(out).toContain("Đã tạo tài khoản quản trị");
    expect(out).not.toContain(PW2);
    expect((await verifyAdminLogin("admin", PW2)).ok).toBe(true);
  });
});
