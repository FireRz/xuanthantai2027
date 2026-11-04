import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";
import {
  clearViewerPassword,
  setViewerPassword,
  verifyViewerPassword,
} from "../../src/server/auth/viewer-pass";
import { SORT_LABELS } from "../../src/components/catalog/catalog-toolbar";

// Trang /phan-tich (cổng mật khẩu xem chung). Chạy trên DB dev đã seed (npm run seed).
// Seed có Bán = 0 nên "Bán chạy nhất" rỗng → test bấm mã dùng danh sách "Còn thiếu nhiều nhất".

const PASSWORD = "xem-thu-2027";
const REFS_KEY = "e2e_analytics_refs";

/**
 * Hai project (mobile, desktop) dùng chung một DB nên không thể đặt mật khẩu rồi xóa tùy ý:
 * đặt lại làm đổi phiên bản và vô hiệu cookie của project kia; xóa khi project kia còn chạy làm nó hỏng.
 * Cách làm: đếm số worker đang dùng (khóa app_setting `e2e_analytics_refs`, tăng giảm nguyên tử).
 * Chỉ đặt mật khẩu khi chưa có hoặc đang sai; chỉ xóa khi worker cuối cùng kết thúc.
 */
async function acquirePassword() {
  await prisma.$executeRaw`INSERT INTO app_setting (key, value, updated_at) VALUES (${REFS_KEY}, '1', now())
    ON CONFLICT (key) DO UPDATE SET value = (app_setting.value::int + 1)::text, updated_at = now()`;
  const check = await verifyViewerPassword(PASSWORD);
  if (!check.ok) await setViewerPassword(PASSWORD);
}

async function releasePassword() {
  const rows = await prisma.$queryRaw<{ value: string }[]>`UPDATE app_setting
    SET value = GREATEST(value::int - 1, 0)::text WHERE key = ${REFS_KEY} RETURNING value`;
  if (rows[0]?.value === "0") {
    await prisma.appSetting.deleteMany({ where: { key: REFS_KEY } });
    await clearViewerPassword();
  }
}

test.beforeAll(acquirePassword);
test.afterAll(async () => {
  await releasePassword();
  await prisma.$disconnect();
});

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const productsTile = (page: Page) =>
  page.locator('[data-testid="summary-tile"][data-key="products"]');
const pathOf = (page: Page) => new URL(page.url()).pathname;

/** Vào /phan-tich và nhập đúng mật khẩu. */
async function openAnalytics(page: Page, query = "") {
  await page.goto(`/phan-tich${query}`);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Xem" }).click();
  await expect(page.getByTestId("summary-tiles")).toBeVisible();
}

/** Chọn nhãn hàng đầu tiên trong danh sách: máy tính qua nút thả xuống, điện thoại qua bảng Lọc. */
async function pickFirstBrand(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByTestId("open-filter-sheet").click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet).toBeVisible();
    await sheet
      .locator("fieldset")
      .filter({ has: page.getByText("Nhãn hàng", { exact: true }) })
      .getByTestId("sheet-chip")
      .first()
      .click();
    await sheet.getByTestId("sheet-apply").click();
    await expect(sheet).toBeHidden();
  } else {
    await page.getByRole("button", { name: /^Nhãn hàng/ }).click();
    await page.getByRole("group", { name: "Nhãn hàng" }).getByRole("checkbox").first().click();
    await page.keyboard.press("Escape");
  }
}

test.describe("trang /phan-tich", () => {
  test("chưa có cookie → form; sai → 'Mật khẩu không đúng'; đúng → thấy Số mã", async ({
    page,
  }) => {
    await page.goto("/phan-tich");
    await expect(page.getByTestId("viewer-password-form")).toBeVisible();
    await expect(page.getByTestId("summary-tiles")).toHaveCount(0);

    await page.locator("input[name=password]").fill("mat-khau-sai-hoan-toan");
    await page.getByRole("button", { name: "Xem" }).click();
    await expect(page.getByTestId("viewer-password-error")).toHaveText("Mật khẩu không đúng");
    await expect(page.getByTestId("summary-tiles")).toHaveCount(0);

    await page.locator("input[name=password]").fill(PASSWORD);
    await page.getByRole("button", { name: "Xem" }).click();
    await expect(page.getByTestId("summary-tiles")).toBeVisible();
    await expect(productsTile(page)).toContainText("Số mã");
    expect(pathOf(page)).toBe("/phan-tich");
  });

  test("lọc một nhãn → URL ở /phan-tich, có brand=, ô Số mã đổi", async ({ page, isMobile }) => {
    await openAnalytics(page);
    const before = await productsTile(page).innerText();
    await pickFirstBrand(page, isMobile);
    await expect(page).toHaveURL(/brand=/);
    expect(pathOf(page)).toBe("/phan-tich");
    await expect(productsTile(page)).not.toHaveText(before);
  });

  test("đổi chiều nhóm sang Dòng → nhom=line; đổi bộ lọc sau đó vẫn giữ nhom=line và ở /phan-tich", async ({
    page,
    isMobile,
  }) => {
    await openAnalytics(page);
    await page.locator('[data-testid="group-dim"][data-dim="line"]').click();
    await expect(page).toHaveURL(/nhom=line/);
    await expect(page.getByTestId("group-table")).toHaveAttribute("data-dim", "line");

    await pickFirstBrand(page, isMobile);
    await expect(page).toHaveURL(/brand=/);
    await expect(page).toHaveURL(/nhom=line/);
    expect(pathOf(page)).toBe("/phan-tich");
    await expect(page.getByTestId("group-table")).toHaveAttribute("data-dim", "line");
  });

  test("bấm tên nhóm trong bảng → bộ lọc có thêm giá trị đó", async ({ page }) => {
    await openAnalytics(page);
    await expect(page).not.toHaveURL(/brand=/);
    await page.getByTestId("group-link").first().click();
    await expect(page).toHaveURL(/brand=/);
    expect(pathOf(page)).toBe("/phan-tich");
    await expect(page.getByTestId("summary-tiles")).toBeVisible();
  });

  test("bấm mã trong Top → popup SP mở; ✕ → về /phan-tich (không về /)", async ({ page }) => {
    await openAnalytics(page);
    const list = page.locator('[data-testid="top-list"][data-kind="shortage"]');
    const item = list.getByTestId("top-item").first();
    await expect(item).toBeVisible();
    const sku = await item.getAttribute("data-sku");
    await item.getByTestId("product-link").click();

    await expect(page).toHaveURL(new RegExp(`sp=${sku}`));
    expect(pathOf(page)).toBe("/phan-tich");
    await expect(page.getByTestId("product-detail")).toBeVisible();

    await page.getByTestId("product-dialog-close").click();
    await expect(page.getByTestId("product-detail")).toBeHidden();
    expect(pathOf(page)).toBe("/phan-tich");
    await expect(page).not.toHaveURL(/sp=/);
    await expect(page.getByTestId("summary-tiles")).toBeVisible();
  });

  test("không có menu Sắp xếp, không có công tắc Chỉ xem hình (thanh lọc, bảng Lọc, thanh dính)", async ({
    page,
  }) => {
    await openAnalytics(page);
    // Giới hạn trong thanh lọc / bảng Lọc / thanh dính: tiêu đề Top 10 cố ý trùng chữ với nhãn sắp xếp.
    const sortWords = Object.values(SORT_LABELS);
    const noSort = async (testId: string) => {
      const text = await page.getByTestId(testId).evaluate((el) => el.textContent ?? "");
      expect(text).not.toContain("Sắp xếp");
      for (const label of sortWords) expect(text).not.toContain(label);
    };
    await noSort("filter-bar");
    await noSort("filter-sheet"); // bảng Lọc điện thoại nằm sẵn trong DOM
    await expect(page.getByTestId("sort-menu")).toHaveCount(0);

    // Cuộn xuống để thanh lọc dính (FilterDock) hiện ra.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByTestId("filter-dock")).toBeVisible();
    await noSort("filter-dock");
    await expect(page.getByTestId("dock-sort-menu")).toHaveCount(0);

    await expect(page.getByRole("switch", { name: "Chỉ xem hình" })).toHaveCount(0);
    await expect(page.getByTestId("photo-switch")).toHaveCount(0);
    // Đối chứng: tiêu đề Top 10 vẫn có mặt trên trang.
    await expect(page.getByRole("heading", { name: "Bán chạy nhất" })).toBeVisible();
  });

  test("không cuộn ngang cả trang", async ({ page }) => {
    await openAnalytics(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.locator('[data-testid="group-dim"][data-dim="line"]').click();
    await expect(page).toHaveURL(/nhom=line/);
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("chân trang danh mục có link Phân tích tới /phan-tich", async ({ page }) => {
    await page.goto("/");
    const link = page.getByTestId("footer-analytics-link");
    await link.scrollIntoViewIfNeeded();
    await expect(link).toHaveAttribute("href", "/phan-tich");
    await link.click();
    await expect(page).toHaveURL(/\/phan-tich/);
  });
});
