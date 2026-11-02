import { expect, test } from "@playwright/test";

test("trang chủ hiển thị tiêu đề Xuân Thần Tài 2027", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Xuân Thần Tài 2027");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Xuân Đinh Mùi · 2027");
});
