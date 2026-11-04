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

  test("điện thoại: bảng lọc ở chế độ hình không có kiểu sắp xếp dựa trên số lượng", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Chỉ điện thoại");
    await page.goto("/?xem=hinh");
    await page.getByTestId("open-filter-sheet").click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet.getByRole("button", { name: "Mã SP A→Z" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Còn thiếu nhiều nhất" })).toHaveCount(0);
    await expect(sheet.getByRole("button", { name: "Bán chạy nhất" })).toHaveCount(0);
  });

  test("0 kết quả: Xóa lọc giữ chế độ Chỉ xem hình", async ({ page }) => {
    await page.goto("/?xem=hinh&q=KHONG-CO-MA-NAY");
    await page.getByRole("link", { name: "Xóa lọc" }).click();
    await expect(cards(page).first()).toBeVisible();
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(page).not.toHaveURL(/q=/);
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

// Chuyển SP trước/sau trong popup (cả chế độ đầy đủ lẫn chế độ hình): nút mũi tên, phím ←/→, vuốt.
test.describe("chuyển SP trước/sau trong popup", () => {
  const detail = (page: Page) => page.getByTestId("product-detail");
  const nextButton = (page: Page) => page.getByRole("button", { name: "Sản phẩm sau" });
  const prevButton = (page: Page) => page.getByRole("button", { name: "Sản phẩm trước" });
  const skuAt = async (page: Page, i: number) =>
    (await cards(page).nth(i).getAttribute("data-sku"))!;

  /** Vuốt bằng cảm ứng thật (CDP) từ `from` tới `to` (tọa độ trong khung nhìn). */
  async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    const cdp = await page.context().newCDPSession(page);
    const point = (k: number) => [
      { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k },
    ];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(0) });
    for (let i = 1; i <= 10; i++)
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(i / 10) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  }

  test("nút Sản phẩm sau → URL sp= đổi sang mã kế tiếp của lưới, tiêu đề popup đổi, có 2 / N", async ({
    page,
  }) => {
    await page.goto("/");
    const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await expect(page.getByTestId("product-position")).toHaveText(/^1 \/ \d/);
    await expect(prevButton(page)).toHaveCount(0);

    await nextButton(page).click();
    await expect(page).toHaveURL(new RegExp(`sp=${second}`));
    await expect(detail(page)).toHaveAttribute("data-sku", second);
    await expect(page.getByTestId("product-dialog-title")).toContainText(second);
    await expect(page.getByTestId("product-position")).toHaveText(/^2 \/ \d/);
  });

  test("phím → rồi ← quay về SP ban đầu; Back đóng popup luôn (không lùi từng SP)", async ({
    page,
  }) => {
    await page.goto("/");
    const [start, after] = [await skuAt(page, 2), await skuAt(page, 3)];
    await cards(page).nth(2).click();
    await expect(detail(page)).toHaveAttribute("data-sku", start);

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(new RegExp(`sp=${after}`));
    await expect(detail(page)).toHaveAttribute("data-sku", after);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(new RegExp(`sp=${start}`));
    await expect(detail(page)).toHaveAttribute("data-sku", start);

    await page.goBack();
    await expect(page).not.toHaveURL(/sp=/);
    await expect(page.getByTestId("product-dialog")).toHaveCount(0);
    await expect(cards(page).first()).toBeVisible();
  });

  test("SP đầu: không có nút Sản phẩm trước", async ({ page }) => {
    await page.goto("/");
    const first = await skuAt(page, 0);
    await page.goto(`/?sp=${first}`);
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await expect(nextButton(page)).toBeVisible();
    await expect(prevButton(page)).toHaveCount(0);
    // Phím ← ở SP đầu không làm gì
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(new RegExp(`sp=${first}`));
  });

  test("đang ở ?xem=hinh: chuyển SP vẫn giữ xem=hinh và không có detail-summary", async ({
    page,
  }) => {
    await page.goto("/?xem=hinh");
    const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await nextButton(page).click();
    await expect(detail(page)).toHaveAttribute("data-sku", second);
    await expect(page).toHaveURL(new RegExp(`sp=${second}`));
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(page.getByTestId("detail-summary")).toHaveCount(0);
    await expect(page.getByTestId("store-qty-table")).toHaveCount(0);
  });

  test.describe("điện thoại", () => {
    test.skip(({ isMobile }) => !isMobile, "vuốt cảm ứng chỉ kiểm trên điện thoại");

    test("vuốt trái trên ảnh → SP sau", async ({ page }) => {
      await page.goto("/");
      const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
      await page.goto(`/?sp=${first}`);
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      const image = detail(page).getByRole("img").first();
      await expect(image).toBeVisible();
      const box = (await image.boundingBox())!;
      const y = box.y + box.height / 2;
      await swipe(page, { x: box.x + box.width - 20, y }, { x: box.x + 20, y });
      await expect(page).toHaveURL(new RegExp(`sp=${second}`));
      await expect(detail(page)).toHaveAttribute("data-sku", second);
      // Vuốt không mở lớp phóng to ảnh
      await expect(page.getByTestId("image-zoom")).toHaveCount(0);
    });

    test("vuốt ngang trên store-qty-table → sp= không đổi", async ({ page }) => {
      await page.goto("/");
      const first = await skuAt(page, 0);
      await page.goto(`/?sp=${first}`);
      const table = page.getByTestId("store-qty-table");
      // Đưa bảng ra giữa màn hình (không bị thanh tiêu đề dính của popup che).
      await expect(table).toBeVisible();
      await table.evaluate((t) => t.scrollIntoView({ block: "center" }));
      const box = (await table.boundingBox())!;
      const y = box.y + box.height / 2;
      await swipe(page, { x: 330, y }, { x: 40, y });
      // Bảng cuộn ngang (cử chỉ được trình duyệt dùng để cuộn bảng)…
      await expect
        .poll(() => table.evaluate((t) => t.parentElement!.scrollLeft))
        .toBeGreaterThan(0);
      // …và không chuyển SP.
      await page.waitForTimeout(800);
      await expect(page).toHaveURL(new RegExp(`sp=${first}`));
      await expect(detail(page)).toHaveAttribute("data-sku", first);
    });
  });
});
