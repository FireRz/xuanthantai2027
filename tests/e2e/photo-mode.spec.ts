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

// Phóng to ảnh trong popup (cả chế độ đầy đủ lẫn chế độ hình).
// Seed không có ảnh thật → gắn tạm ảnh cho 1 SP riêng của từng project (tránh đụng nhau khi chạy song song), trả lại sau.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("phóng to ảnh trong popup", () => {
  test.describe.configure({ mode: "serial" });
  let sku = "";
  let imageUrl = "";
  let before: { thumbUrl: string | null; imageUrl: string | null };

  test.beforeAll(async ({}, workerInfo) => {
    sku = workerInfo.project.name === "mobile" ? "AK0002" : "AK0003";
    imageUrl = `https://img.test.invalid/large-${sku}.png`;
    const p = await prisma.product.findUniqueOrThrow({ where: { sku } });
    before = { thumbUrl: p.thumbUrl, imageUrl: p.imageUrl };
    await prisma.product.update({
      where: { sku },
      data: { thumbUrl: `https://img.test.invalid/thumb-${sku}.png`, imageUrl },
    });
  });
  test.afterAll(async () => {
    await prisma.product.update({ where: { sku }, data: before });
  });

  test.beforeEach(async ({ page }) => {
    await page.route("https://img.test.invalid/**", (route) =>
      route.fulfill({ contentType: "image/png", body: PNG }),
    );
  });

  const zoomButton = (page: Page) => page.getByRole("button", { name: /Phóng to ảnh/ });
  const zoom = (page: Page) => page.getByTestId("image-zoom");

  for (const [mode, qs] of [
    ["chế độ đầy đủ", ""],
    ["chế độ hình", "xem=hinh&"],
  ] as const) {
    test(`bấm ảnh trong popup → lớp phóng to hiện ảnh gốc (${mode})`, async ({ page }) => {
      await page.goto(`/?${qs}sp=${sku}`);
      await expect(zoom(page)).toHaveCount(0);
      await zoomButton(page).click();
      await expect(zoom(page)).toBeVisible();
      await expect(zoom(page)).toHaveAttribute("open", "");
      await expect(zoom(page).locator("img")).toHaveAttribute("src", imageUrl);
    });
  }

  test("Esc đóng lớp phóng to, popup vẫn mở; Esc lần nữa đóng popup", async ({ page }) => {
    await page.goto(`/?sp=${sku}`);
    await zoomButton(page).click();
    await expect(zoom(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(zoom(page)).toBeHidden();
    await expect(page.getByTestId("product-dialog")).toBeVisible();
    await expect(page).toHaveURL(/sp=/);
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/sp=/);
  });

  test("nút ✕ của lớp phóng to có nhãn Đóng ảnh; bấm → đóng, popup còn", async ({ page }) => {
    await page.goto(`/?sp=${sku}`);
    await zoomButton(page).click();
    await zoom(page).getByRole("button", { name: "Đóng ảnh" }).click();
    await expect(zoom(page)).toHaveCount(0);
    await expect(page.getByTestId("product-dialog")).toBeVisible();
    await expect(page).toHaveURL(/sp=/);
  });
});
