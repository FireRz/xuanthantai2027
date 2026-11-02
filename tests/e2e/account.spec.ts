import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createTestAdmin, login } from "./helpers";

test.describe("đổi mật khẩu (T02.6)", () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    await admin.cleanup();
  });

  test("đổi mật khẩu → mật khẩu cũ hết hiệu lực, mật khẩu mới dùng được", async ({ page }) => {
    const newPassword = randomBytes(12).toString("hex");
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/account");
    await page.getByLabel("Mật khẩu hiện tại").fill(admin.password);
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill(newPassword);
    await page.getByLabel("Nhập lại mật khẩu mới").fill(newPassword);
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();

    await expect(page).toHaveURL(/\/login\?changed=1/);
    await expect(page.getByText("Đã đổi mật khẩu")).toBeVisible();

    await login(page, admin.username, admin.password); // mật khẩu cũ
    await expect(page.locator("p[role=alert]")).toContainText("không đúng");

    await login(page, admin.username, newPassword);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("sai mật khẩu hiện tại / mật khẩu mới không khớp → báo lỗi, không đổi", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/account");
    await page.getByLabel("Mật khẩu hiện tại").fill("sai-mat-khau-hien-tai");
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill("mat-khau-moi-123456");
    await page.getByLabel("Nhập lại mật khẩu mới").fill("mat-khau-moi-123456");
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("Mật khẩu hiện tại không đúng");

    // form được xóa trắng sau khi gửi; nhập lại đủ các ô
    await page.getByLabel("Mật khẩu hiện tại").fill(admin.password);
    await page.getByLabel("Mật khẩu mới", { exact: true }).fill("mat-khau-moi-123456");
    await page.getByLabel("Nhập lại mật khẩu mới").fill("khac-hoan-toan-1");
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
    await expect(page.locator("p[role=alert]")).toContainText("không khớp");

    // vẫn đăng nhập được bằng mật khẩu gốc
    await page.context().clearCookies();
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
  });
});
