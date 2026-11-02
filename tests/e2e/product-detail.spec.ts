import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";

// Chạy trên DB dev đã seed (npm run seed): ≥ 100 SP, ≥ 2 cửa hàng.

const cards = (page: Page) => page.getByTestId("product-card");
const dialog = (page: Page) => page.getByTestId("product-dialog");

test.afterAll(() => prisma.$disconnect());

test.describe("T05.3 popup chi tiết", () => {
  test("bấm thẻ → popup đúng SP, đủ thông tin; bố cục theo thiết bị", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const card = cards(page).nth(2);
    const sku = (await card.getAttribute("data-sku"))!;
    await card.click();
    await expect(page).toHaveURL(new RegExp(`sp=${sku}`));
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-sku", sku);
    await expect(dialog(page)).toContainText(sku);
    await expect(dialog(page).getByRole("img").first()).toBeVisible();

    const box = (await dialog(page).boundingBox())!;
    const vp = page.viewportSize()!;
    if (isMobile) {
      expect(Math.round(box.width)).toBe(vp.width);
      expect(Math.round(box.height)).toBe(vp.height);
    } else {
      expect(box.width).toBeLessThan(vp.width - 100);
      expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThan(2); // giữa màn hình
    }
    const noHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noHScroll).toBe(true);
  });

  test("dạng Bảng: bấm dòng cũng mở popup", async ({ page }) => {
    await page.goto("/?view=list");
    const row = page.getByTestId("product-row").nth(1);
    const sku = (await row.getAttribute("data-sku"))!;
    await row.click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-sku", sku);
  });
});

test.describe("T05.4 bảng số lượng theo cửa hàng", () => {
  test("liệt kê mọi cửa hàng đang hoạt động; tổng khớp số trên thẻ (không lọc CH)", async ({
    page,
  }) => {
    const activeStores = await prisma.store.count({ where: { active: true } });
    await page.goto("/");
    const card = cards(page).first();
    const sku = (await card.getAttribute("data-sku"))!;
    const cardText = await card.innerText();
    await card.click();
    await expect(page.getByTestId("store-qty-row")).toHaveCount(activeStores);

    const totalCells = await page.getByTestId("store-qty-total").locator("td").allInnerTexts();
    const [ordered, received, shortage] = totalCells.map((t) => t.trim());
    // Thẻ hiển thị "Về X/Y" (X = về, Y = đặt) và "Còn thiếu N" khi N > 0.
    expect(cardText.replace(/\s+/g, " ")).toContain(`Về ${received}/${ordered}`);
    if (shortage !== "0") expect(cardText).toContain(`Còn thiếu ${shortage}`);

    // Tổng = cộng các dòng cửa hàng
    const rows = await page
      .getByTestId("store-qty-row")
      .evaluateAll((trs) =>
        trs.map((tr) =>
          [...tr.querySelectorAll("td")].slice(1, 3).map((td) => td.textContent ?? ""),
        ),
      );
    const toInt = (s: string) => Number(s.replace(/\./g, ""));
    expect(rows.reduce((a, r) => a + toInt(r[0]), 0)).toBe(toInt(ordered));
    expect(rows.reduce((a, r) => a + toInt(r[1]), 0)).toBe(toInt(received));
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-sku", sku);
  });

  test("đang lọc cửa hàng X → dòng X được làm nổi; không lọc → không dòng nào", async ({
    page,
  }) => {
    const store = await prisma.store.findFirstOrThrow({
      where: { active: true },
      orderBy: { code: "asc" },
    });
    await page.goto(`/?store=${store.code}&all=1`);
    await cards(page).first().click();
    const hl = page.locator('[data-testid="store-qty-row"][data-highlight="true"]');
    await expect(hl).toHaveCount(1);
    await expect(hl).toHaveAttribute("data-store", store.code);

    await page.goto("/");
    await cards(page).first().click();
    await expect(page.getByTestId("store-qty-table")).toBeVisible();
    await expect(page.locator('[data-testid="store-qty-row"][data-highlight="true"]')).toHaveCount(
      0,
    );
  });
});

test.describe("T05.5 ?sp= và đóng popup", () => {
  test("mở link có ?sp= → popup mở sẵn; Esc đóng, giữ nguyên bộ lọc", async ({ page }) => {
    const p = await prisma.product.findFirstOrThrow({
      where: { active: true },
      orderBy: { sku: "asc" },
    });
    await page.goto(`/?q=${p.sku.slice(0, 3)}&sort=price_asc&sp=${p.sku}`);
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-sku", p.sku);
    await expect(dialog(page)).toBeVisible(); // đã hydrate và mở dạng modal
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/sp=/);
    await expect(page).toHaveURL(new RegExp(`q=${p.sku.slice(0, 3)}`));
    await expect(page).toHaveURL(/sort=price_asc/);
  });

  test("bấm thẻ rồi Back → popup đóng, bộ lọc và vị trí cuộn còn", async ({ page }) => {
    await page.goto("/?sort=price_desc&n=48");
    await expect(cards(page)).toHaveCount(48);
    await page.getByTestId("product-grid").locator("> li").nth(40).scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => Math.round(window.scrollY));
    expect(y).toBeGreaterThan(300);
    await cards(page).nth(40).click();
    await expect(dialog(page)).toBeVisible();
    await page.goBack();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(page).toHaveURL(/n=48/);
    await expect(cards(page)).toHaveCount(48);
    const y2 = await page.evaluate(() => Math.round(window.scrollY));
    expect(Math.abs(y2 - y)).toBeLessThan(5);
  });

  test("nút ✕ và bấm ngoài đóng popup, giữ bộ lọc", async ({ page, isMobile }) => {
    await page.goto("/?sort=price_asc");
    await cards(page).first().click();
    await page.getByTestId("product-dialog-close").click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page).not.toHaveURL(/sp=/);

    if (!isMobile) {
      await cards(page).first().click();
      await expect(dialog(page)).toBeVisible();
      await page.mouse.click(5, 5); // vùng nền mờ ngoài cửa sổ
      await expect(dialog(page)).toHaveCount(0);
      await expect(page).toHaveURL(/sort=price_asc/);
    }
  });
});

test.describe("T05.6 không tìm thấy", () => {
  test("?sp= không tồn tại → thông báo; đóng được", async ({ page }) => {
    await page.goto("/?sp=KHONG-CO-MA-NAY");
    await expect(page.getByTestId("product-not-found")).toContainText("KHONG-CO-MA-NAY");
    await expect(page.getByTestId("product-dialog-title")).toHaveText("Không tìm thấy sản phẩm");
    await page.getByTestId("product-dialog-close").click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(cards(page).first()).toBeVisible();
  });

  test("SP bị ẩn → cũng báo không tìm thấy", async ({ page }) => {
    const p = await prisma.product.findFirstOrThrow({
      where: { active: true },
      orderBy: { sku: "desc" },
    });
    await prisma.product.update({ where: { id: p.id }, data: { active: false } });
    try {
      await page.goto(`/?sp=${p.sku}`);
      await expect(page.getByTestId("product-not-found")).toBeVisible();
    } finally {
      await prisma.product.update({ where: { id: p.id }, data: { active: true } });
    }
  });
});
