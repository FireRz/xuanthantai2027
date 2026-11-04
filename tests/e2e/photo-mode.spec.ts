import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";

// Chế độ Chỉ xem hình (?xem=hinh). Chạy trên DB dev đã seed (npm run seed).

const cards = (page: Page) => page.getByTestId("product-card");
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const photoToggle = (page: Page) => page.getByRole("link", { name: "Chỉ xem hình" });

test.afterAll(() => prisma.$disconnect());

test.describe("chế độ Chỉ xem hình", () => {
  test("/?xem=hinh: thẻ không có progressbar, không có nút Xuất Excel", async ({ page }) => {
    await page.goto("/?xem=hinh");
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByTestId("export-button")).toHaveCount(0);
    await expect(page.getByTestId("export-button-mobile")).toHaveCount(0);
    await expect(page.getByTestId("export-menu")).toHaveCount(0);
    await expect(photoToggle(page)).toHaveAttribute("aria-pressed", "true");

    // Chế độ đầy đủ vẫn có progressbar (đối chứng)
    await page.goto("/");
    await expect(page.getByRole("progressbar").first()).toBeVisible();
  });

  test("bấm Chỉ xem hình → URL có xem=hinh; lọc tìm mã vẫn giữ; bấm lại → mất xem=hinh", async ({
    page,
  }) => {
    await page.goto("/");
    await photoToggle(page).click();
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(photoToggle(page)).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("searchbox", { name: "Tìm mã SP" }).pressSequentially("ak00", {
      delay: 60,
    });
    await expect(page).toHaveURL(/q=ak00/);
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(page.getByRole("progressbar")).toHaveCount(0);

    await photoToggle(page).click();
    await expect(page).not.toHaveURL(/xem=hinh/);
    await expect(page).toHaveURL(/q=ak00/);
    await expect(photoToggle(page)).toHaveAttribute("aria-pressed", "false");
  });

  test("mở thẳng /?xem=hinh&sp=<mã đầu tiên>: popup có ảnh, không có tóm tắt và bảng cửa hàng", async ({
    page,
  }) => {
    await page.goto("/?xem=hinh");
    const sku = (await cards(page).first().getAttribute("data-sku"))!;
    await page.goto(`/?xem=hinh&sp=${sku}`);
    const detail = page.getByTestId("product-detail");
    await expect(detail).toHaveAttribute("data-sku", sku);
    await expect(detail.getByRole("img").first()).toBeVisible();
    await expect(page.getByTestId("detail-summary")).toHaveCount(0);
    await expect(page.getByTestId("store-qty-table")).toHaveCount(0);
  });

  test("/?xem=hinh&sort=shortage: sort-menu có giá trị sku", async ({ page }) => {
    await page.goto("/?xem=hinh&sort=shortage");
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByTestId("sort-menu")).toHaveValue("sku");
  });

  test("/?xem=hinh&view=list ở 375px: không cuộn ngang cả trang", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?xem=hinh&view=list");
    await expect(page.getByTestId("product-row").first()).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});
