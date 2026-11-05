import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { assertLocalDatabase } from "./helpers";

// Bộ lọc "Khu vực" (?kv=) trên thanh cửa hàng. Chạy trên DB dev đã seed (npm run seed: CH001…).
// Hai project (điện thoại, máy tính) chạy song song trên cùng DB nên dữ liệu khu vực được đặt
// lặp lại được (idempotent) và không khôi phục: CH001, CH002 → "91"; CH003 → "92".

const regionSelect = (page: Page) => page.getByRole("combobox", { name: "Khu vực" });
const storeSelect = (page: Page) => page.getByRole("combobox", { name: "Cửa hàng của bạn" });

test.beforeAll(async () => {
  assertLocalDatabase();
  await prisma.store.updateMany({
    where: { code: { in: ["CH001", "CH002"] } },
    data: { region: "91" },
  });
  await prisma.store.updateMany({ where: { code: "CH003" }, data: { region: "92" } });
});
test.afterAll(() => prisma.$disconnect());

test.describe("bộ lọc Khu vực", () => {
  test("chọn khu vực → URL kv=, ô cửa hàng chỉ còn cửa hàng của khu vực, nhãn phạm vi đổi", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(regionSelect(page)).toBeVisible();
    await regionSelect(page).selectOption("91");
    await expect(page).toHaveURL(/kv=91/);
    await expect(page.getByTestId("scope-label")).toContainText("Khu vực 91");
    const codes = await storeSelect(page)
      .locator("option")
      .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(codes).toEqual(["", "CH001", "CH002"]);
    // Ô khu vực đứng trước ô cửa hàng, cùng một hàng.
    const r = (await regionSelect(page).boundingBox())!;
    const s = (await storeSelect(page).boundingBox())!;
    expect(r.x + r.width).toBeLessThanOrEqual(s.x);
    expect(Math.abs(r.y - s.y)).toBeLessThan(4);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });

  test("đổi sang khu vực khác: bỏ cửa hàng không thuộc khu vực mới; cửa hàng thuộc khu vực thì giữ", async ({
    page,
  }) => {
    await page.goto("/?kv=91&store=CH001");
    await expect(page.getByTestId("scope-label")).toContainText("CH001");
    await regionSelect(page).selectOption("92");
    await expect(page).toHaveURL(/kv=92/);
    await expect(page).not.toHaveURL(/store=/);
    await storeSelect(page).selectOption("CH003");
    await expect(page).toHaveURL(/kv=92&store=CH003/);
    await regionSelect(page).selectOption("");
    await expect(page).not.toHaveURL(/kv=/);
    await expect(page).toHaveURL(/store=CH003/);
  });

  test("popup trong khu vực: bảng chỉ gồm cửa hàng của khu vực", async ({ page }) => {
    await page.goto("/?kv=91");
    const card = page.getByTestId("product-card").first();
    const sku = (await card.getAttribute("data-sku"))!;
    await card.click();
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-sku", sku);
    const rows = page.getByTestId("store-qty-row");
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId("detail-scope")).toContainText("Khu vực 91");
  });
});
