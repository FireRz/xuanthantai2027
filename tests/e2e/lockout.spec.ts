import { expect, test } from "@playwright/test";
import { createTestAdmin, login } from "./helpers";

test("sai 5 lần → lần thứ 6 báo tạm khóa, kể cả khi nhập đúng mật khẩu (T02.7)", async ({
  page,
}) => {
  const admin = await createTestAdmin();
  try {
    for (let i = 0; i < 5; i++) {
      await login(page, admin.username, "sai-mat-khau");
      await expect(page.locator("p[role=alert]")).toContainText("không đúng");
    }
    await login(page, admin.username, admin.password);
    await expect(page.locator("p[role=alert]")).toContainText("tạm khóa");
    await expect(page).toHaveURL(/\/login/);
  } finally {
    await admin.cleanup();
  }
});
