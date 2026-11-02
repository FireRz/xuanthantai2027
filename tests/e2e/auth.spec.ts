import { expect, test } from "@playwright/test";
import { createTestAdmin, login } from "./helpers";

test.describe("đăng nhập quản trị (T02.2, T02.3)", () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  test.beforeAll(async () => {
    admin = await createTestAdmin();
  });
  test.afterAll(async () => {
    await admin.cleanup();
  });

  test("đúng mật khẩu → vào /admin", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
  });

  test("sai mật khẩu → báo lỗi, vẫn ở /login", async ({ page }) => {
    await login(page, admin.username, "sai-mat-khau");
    await expect(page.locator("p[role=alert]")).toContainText("không đúng");
    await expect(page).toHaveURL(/\/login/);
  });

  test("chưa đăng nhập vào /admin → chuyển về /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin/account");
    await expect(page).toHaveURL(/\/login/);
  });

  test("trang xem / công khai, không cần đăng nhập", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
  });

  test("đăng xuất rồi không vào lại /admin được", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
