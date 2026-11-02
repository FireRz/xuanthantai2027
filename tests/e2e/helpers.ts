import { randomBytes } from "node:crypto";
import type { Page } from "@playwright/test";
import { hashPassword } from "../../src/lib/password";
import { prisma } from "../../src/server/db";

/** Tài khoản quản trị tạm cho một test: tên và mật khẩu ngẫu nhiên, không ghi vào mã nguồn. */
export async function createTestAdmin() {
  const username = `e2e-${randomBytes(4).toString("hex")}`;
  const password = randomBytes(12).toString("hex");
  await prisma.adminUser.create({
    data: { username, passwordHash: await hashPassword(password) },
  });
  return {
    username,
    password,
    cleanup: () => prisma.adminUser.deleteMany({ where: { username } }),
  };
}

export async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}
