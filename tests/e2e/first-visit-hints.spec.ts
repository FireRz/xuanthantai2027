import { expect, test, type Page } from "@playwright/test";

// Gợi ý lần đầu (ADR-009 U20): hiện lần lượt, mỗi gợi ý một lần. Chạy trên DB dev đã seed.

const QUEUE = ["store", "search", "photo", "view", "card"] as const;
type Id = (typeof QUEUE)[number] | "popup";

const keyOf = (id: Id) => (id === "photo" ? "xtt-photo-hint-seen" : `xtt-hint-${id}`);
const hint = (page: Page, id: Id) => page.getByTestId(id === "photo" ? "photo-hint" : `hint-${id}`);

/** Đánh dấu các gợi ý đã xem để kiểm tra riêng từng gợi ý (chỉ đặt một lần, không ghi đè lần sau). */
async function markSeen(page: Page, ids: readonly Id[]) {
  await page.addInitScript((keys) => {
    if (sessionStorage.getItem("hints-seeded")) return;
    sessionStorage.setItem("hints-seeded", "1");
    keys.forEach((k) => localStorage.setItem(k, "1"));
  }, ids.map(keyOf));
}

const only = (id: Id) => QUEUE.filter((x) => x !== id);
/** Chạm vào vùng trống: tắt bong bóng đang hiện. */
const tap = (page: Page) => page.mouse.click(2, 300);
const visibleBubbles = (page: Page) =>
  page.locator('[role="tooltip"][data-testid^="hint-"]:visible').count();

async function expectFits(page: Page, id: Id) {
  const box = (await hint(page, id).boundingBox())!;
  const { width, height } = page.viewportSize()!;
  const at = `${id} ở khổ ${width}px: ${JSON.stringify(box)}`;
  expect(box.x, at).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, at).toBeLessThanOrEqual(width);
  expect(box.y, at).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, at).toBeLessThanOrEqual(height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), at).toBe(
    true,
  );
}

test.describe("gợi ý lần đầu", () => {
  test("hiện lần lượt từng cái theo đúng thứ tự; vị trí trong trang chờ cuộn tới", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(hint(page, "store")).toBeVisible({ timeout: 25_000 });
    expect(await visibleBubbles(page)).toBe(1);
    await tap(page);
    await expect(hint(page, "store")).toBeHidden();
    await expect(hint(page, "search")).toBeVisible();
    expect(await visibleBubbles(page)).toBe(1);
    await tap(page);
    await expect(hint(page, "photo")).toBeVisible();
    await tap(page);
    await expect(hint(page, "photo")).toBeHidden();

    await page
      .getByRole("group", { name: "Kiểu hiển thị" })
      .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200));
    await expect(hint(page, "view")).toBeVisible();
    await tap(page);
    await expect(hint(page, "view")).toBeHidden();

    await page
      .getByTestId("product-card")
      .first()
      .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200));
    await expect(hint(page, "card")).toBeVisible();
    await tap(page);
    await expect(hint(page, "card")).toBeHidden();
  });

  test("mỗi gợi ý chỉ hiện một lần, tải lại trang không hiện lại", async ({ page }) => {
    await markSeen(page, only("store"));
    await page.goto("/");
    await expect(hint(page, "store")).toBeVisible({ timeout: 25_000 });
    await page.reload();
    await expect(page.getByRole("searchbox", { name: "Tìm mã SP" })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await visibleBubbles(page)).toBe(0);
  });

  test("không che bấm: chọn được cửa hàng ngay khi gợi ý đang hiện", async ({ page }) => {
    await markSeen(page, only("store"));
    await page.goto("/");
    await expect(hint(page, "store")).toBeVisible({ timeout: 25_000 });
    await page.getByRole("combobox", { name: "Cửa hàng của bạn" }).selectOption({ index: 1 });
    await expect(page).toHaveURL(/store=/);
  });

  test("đang gõ tìm mã thì gợi ý tiếp theo chờ, gõ xong mới hiện", async ({ page }) => {
    await markSeen(page, ["store", "search", "view", "card"]);
    await page.goto("/", { waitUntil: "commit" });
    const search = page.getByRole("searchbox", { name: "Tìm mã SP" });
    await search.focus();
    await page.waitForTimeout(2500);
    await expect(hint(page, "photo")).toBeHidden();
    await search.blur();
    await expect(hint(page, "photo")).toBeVisible({ timeout: 25_000 });
  });

  for (const width of [320, 375, 768, 1280])
    for (const [id, target] of [
      ["store", null],
      ["search", null],
      ["view", '[aria-label="Kiểu hiển thị"]'],
      ["card", '[data-testid="product-card"]'],
    ] as const)
      test(`khổ ${width}px: bong bóng ${id} nằm trọn trong màn hình`, async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, "Khổ màn hình đã đặt riêng, chạy một project là đủ");
        await page.setViewportSize({ width, height: 800 });
        await markSeen(page, only(id));
        await page.goto("/");
        if (target) {
          await page
            .locator(target)
            .first()
            .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 200));
        }
        await expect(hint(page, id)).toBeVisible({ timeout: 25_000 });
        await expectFits(page, id);
      });

  test("popup: gợi ý chuyển SP hiện khi mở lần đầu, các gợi ý phía sau phải chờ", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.getByTestId("product-link").first().click();
    await expect(page.getByTestId("product-dialog")).toBeVisible();
    const popup = hint(page, "popup");
    await expect(popup).toBeVisible();
    await expect(popup).toContainText(isMobile ? "Vuốt ngang" : "phím ← →");
    await expectFits(page, "popup");
    expect(await visibleBubbles(page)).toBe(1);

    // Vẫn trong popup: tắt gợi ý thì không có gợi ý nào của trang nền chen vào.
    await page.getByTestId("product-dialog-title").click();
    await expect(popup).toBeHidden();
    await page.waitForTimeout(2000);
    expect(await visibleBubbles(page)).toBe(0);

    // Đóng popup rồi mở lại: không hiện lại.
    await page.getByTestId("product-dialog-close").click();
    await expect(page.getByTestId("product-dialog")).toBeHidden();
    await page.getByTestId("product-link").first().click();
    await expect(page.getByTestId("product-dialog")).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(popup).toBeHidden();
  });

  test("chế độ Chỉ xem hình: không nhắc chọn cửa hàng để xem số", async ({ page }) => {
    await page.goto("/?xem=hinh");
    await expect(hint(page, "search")).toBeVisible({ timeout: 25_000 });
    await expect(hint(page, "store")).toHaveCount(0);
  });
});
