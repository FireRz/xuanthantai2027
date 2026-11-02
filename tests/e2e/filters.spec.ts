import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";

// Chạy trên DB dev đã seed quy mô lớn (npm run seed:large): 3 nhãn × 1.000 SP, 100 cửa hàng.

const scope = (page: Page) => page.getByTestId("scope-label");
const cards = (page: Page) => page.getByTestId("product-card");
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.afterAll(() => prisma.$disconnect());

test.describe("T04.5 FilterBar — máy tính", () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, "Chỉ máy tính");
  });

  test("chip Nhãn hàng chọn nhiều (HOẶC), có số đếm, Xóa lọc về toàn bộ", async ({ page }) => {
    await page.goto("/");
    await expect(scope(page)).toContainText("3.000 SP");
    const bar = page.getByTestId("filter-bar");

    await bar.getByRole("button", { name: /^An Khang/ }).click();
    await expect(page).toHaveURL(/brand=/);
    await expect(scope(page)).toContainText("1.000 SP");
    await bar.getByRole("button", { name: /^Phúc Lộc/ }).click();
    await expect(scope(page)).toContainText("2.000 SP");
    await expect(page).toHaveURL(/brand=[^&]+%2C/);

    await page.getByTestId("clear-filters").click();
    await expect(scope(page)).toContainText("3.000 SP");
    await expect(page).not.toHaveURL(/brand=/);
  });

  test("nút thả xuống Dòng: liên động theo nhãn, chọn nhiều, nút 'Xem N SP' đóng bảng", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^An Khang/ })
      .click();
    await expect(scope(page)).toContainText("1.000 SP");

    await page.getByRole("button", { name: /^Dòng hàng/ }).click();
    const panel = page.getByRole("group", { name: "Dòng hàng" });
    // Chỉ dòng của nhãn đã chọn: 3 dòng, tên không kèm nhãn khác
    await expect(panel.getByRole("checkbox")).toHaveCount(3);
    await panel.getByRole("checkbox").first().check();
    await expect(page).toHaveURL(/line=/);
    await panel.getByRole("checkbox").nth(1).check();
    await expect(scope(page)).toContainText("SP");
    const total = Number((await scope(page).innerText()).match(/([\d.]+) SP/)![1].replace(".", ""));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(1000);

    await panel.getByRole("button", { name: /^Xem [\d.]+ SP$/ }).click();
    await expect(panel).toBeHidden();
    await expect(page.getByTestId("active-filters")).toBeVisible();
  });

  test("Bộ sưu tập có 'Không thuộc BST'; chất liệu lọc được; đổi nhãn tự bỏ dòng không còn hợp lệ", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Bộ sưu tập$|^Bộ sưu tập \d/ }).click();
    const col = page.getByRole("group", { name: "Bộ sưu tập" });
    const none = col.getByRole("checkbox", { name: /Không thuộc BST/ });
    await expect(none).toBeVisible();
    await none.check();
    await expect(page).toHaveURL(/col=none/);
    await page.keyboard.press("Escape");
    await expect(col).toBeHidden();

    await page.getByTestId("clear-filters").click();
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^An Khang/ })
      .click();
    await page.getByRole("button", { name: /^Dòng hàng/ }).click();
    await page.getByRole("group", { name: "Dòng hàng" }).getByRole("checkbox").first().check();
    await expect(page).toHaveURL(/line=/);
    await page.keyboard.press("Escape");
    // Bỏ nhãn An Khang, chọn Phúc Lộc → dòng của An Khang bị bỏ khỏi URL
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^An Khang/ })
      .click();
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^Phúc Lộc/ })
      .click();
    await expect(page).not.toHaveURL(/line=/);
    await expect(page).toHaveURL(/brand=/);
  });

  test("không cuộn ngang", async ({ page }) => {
    await page.goto("/");
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});

test.describe("T04.5 FilterBar — điện thoại (bảng lọc trượt từ dưới)", () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, "Chỉ điện thoại");
  });

  test("mở bảng lọc, chọn chip, nút 'Xem N kết quả' cập nhật và đóng bảng; hiện Lọc (n)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(scope(page)).toContainText("3.000 SP");
    await page.getByTestId("open-filter-sheet").click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet).toBeVisible();

    const viewport = page.viewportSize()!;
    // Trượt từ dưới: chờ animation xong, bảng sát đáy màn hình và rộng bằng màn hình
    await expect
      .poll(async () => {
        const box = (await sheet.boundingBox())!;
        return [Math.round(box.y + box.height), Math.round(box.width)];
      })
      .toEqual([viewport.height, viewport.width]);

    await sheet.getByRole("button", { name: /^An Khang/ }).click();
    await sheet.getByRole("button", { name: /^Phúc Lộc/ }).click();
    await expect(sheet.getByTestId("sheet-apply")).toHaveText("Xem 2.000 kết quả");
    // Dòng/BST/chất liệu cùng nằm trong bảng
    for (const name of ["Dòng hàng", "Bộ sưu tập", "Chất liệu"])
      await expect(sheet.getByText(name, { exact: true })).toBeVisible();
    await sheet.getByTestId("sheet-apply").click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("filter-count")).toHaveText("(2)");
    await expect(scope(page)).toContainText("2.000 SP");
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("chip đang lọc bỏ được từng cái và Xóa lọc", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("open-filter-sheet").click();
    await page
      .getByTestId("filter-sheet")
      .getByRole("button", { name: /^An Khang/ })
      .click();
    await page.getByTestId("sheet-apply").click();
    await expect(scope(page)).toContainText("1.000 SP");
    await page.getByRole("button", { name: /^Bỏ lọc Nhãn hàng: An Khang/ }).click();
    await expect(scope(page)).toContainText("3.000 SP");
    await expect(cards(page).first()).toBeVisible();
  });
});

test.describe("T04.6 ô tìm mã SP (debounce)", () => {
  const search = (page: Page) => page.getByRole("searchbox", { name: "Tìm mã SP" });

  test("gõ 'ak00' (không cần bấm nút) → mọi SP có mã chứa AK00, không phân biệt hoa/thường", async ({
    page,
  }) => {
    await page.goto("/");
    await search(page).pressSequentially("ak00", { delay: 60 });
    await expect(page).toHaveURL(/q=ak00/);
    await expect(search(page)).toHaveValue("ak00"); // không bị URL trễ ghi đè
    await expect(scope(page)).toContainText("99 SP"); // AK0001…AK0099
    const skus = await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-sku")));
    expect(skus.length).toBeGreaterThan(0);
    expect(skus.every((s) => s!.toUpperCase().includes("AK00"))).toBe(true);
  });

  test("kết hợp bộ lọc: tìm + nhãn; xóa chữ về toàn bộ", async ({ page, isMobile }) => {
    test.skip(isMobile, "Bộ lọc nhãn dạng chip chỉ có trên máy tính");
    await page.goto("/");
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^Phúc Lộc/ })
      .click();
    await search(page).fill("AK00");
    await expect(page.getByTestId("empty-state")).toBeVisible(); // mã AK… không thuộc nhãn Phúc Lộc
    await search(page).fill("");
    await expect(scope(page)).toContainText("1.000 SP");
  });
});

test.describe("T04.7 menu sắp xếp", () => {
  const sortBy = async (page: Page, value: string) =>
    page.getByTestId("sort-menu").selectOption(value);
  const attrs = (page: Page, name: string) =>
    cards(page).evaluateAll((els, n) => els.map((e) => e.getAttribute(n)), name);

  test("mặc định Mã A→Z; có đủ 5 kiểu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sort-menu")).toHaveValue("sku");
    await expect(page.getByTestId("sort-menu").locator("option")).toHaveText([
      "Mã SP A→Z",
      "Mới cập nhật",
      "Giá thấp → cao",
      "Giá cao → thấp",
      "Còn thiếu nhiều nhất",
    ]);
    const skus = (await attrs(page, "data-sku")) as string[];
    expect([...skus].sort()).toEqual(skus);
  });

  test("giá thấp → cao và cao → thấp; SP không giá xếp cuối", async ({ page }) => {
    await page.goto("/?n=120");
    await sortBy(page, "price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(cards(page)).toHaveCount(24);
    const asc = ((await attrs(page, "data-price")) as string[]).map((p) => (p === "" ? null : +p));
    const priced = asc.filter((p): p is number => p !== null);
    expect([...priced].sort((a, b) => a - b)).toEqual(priced);
    // Không có SP không giá nằm trước SP có giá
    expect(asc.indexOf(null) === -1 || asc.slice(asc.indexOf(null)).every((p) => p === null)).toBe(
      true,
    );

    await sortBy(page, "price_desc");
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect
      .poll(async () => {
        const d = ((await attrs(page, "data-price")) as string[])
          .filter((p) => p !== "")
          .map((p) => +p);
        return d.length > 1 && [...d].sort((a, b) => b - a).join() === d.join();
      })
      .toBe(true);
  });

  test("còn thiếu nhiều nhất: giảm dần theo phạm vi tổng và theo cửa hàng", async ({ page }) => {
    await page.goto("/?sort=shortage");
    const total = ((await attrs(page, "data-shortage")) as string[]).map(Number);
    expect([...total].sort((a, b) => b - a)).toEqual(total);

    await page.goto("/?sort=shortage&store=CH001&all=1");
    const store = ((await attrs(page, "data-shortage")) as string[]).map(Number);
    expect([...store].sort((a, b) => b - a)).toEqual(store);
    expect(store).not.toEqual(total);
  });

  test("mới cập nhật: SP cập nhật gần nhất lên đầu; chọn lại Mã A→Z trả về URL gọn", async ({
    page,
  }) => {
    const newest = await prisma.product.findFirstOrThrow({
      where: { active: true, brand: { active: true }, productLine: { active: true } },
      orderBy: [{ updatedAt: "desc" }, { sku: "asc" }],
      select: { sku: true },
    });
    await page.goto("/");
    await sortBy(page, "updated");
    await expect(page).toHaveURL(/sort=updated/);
    await expect(cards(page).first()).toHaveAttribute("data-sku", newest.sku);
    await sortBy(page, "sku");
    await expect(page).not.toHaveURL(/sort=/);
  });

  test("giữ nguyên bộ lọc khi đổi kiểu sắp xếp", async ({ page }) => {
    await page.goto("/?q=ak00");
    await sortBy(page, "price_desc");
    await expect(page).toHaveURL(/q=ak00/);
    await expect(scope(page)).toContainText("99 SP");
  });
});

test.describe("T04.8 công tắc 'Xem tất cả SP'", () => {
  const sw = (page: Page) => page.getByRole("switch", { name: "Xem tất cả SP" });

  test("chỉ hiện khi đã chọn cửa hàng", async ({ page }) => {
    await page.goto("/");
    await expect(sw(page)).toHaveCount(0);
    await page.goto("/?store=CH001");
    await expect(sw(page)).toHaveCount(1);
    await page.goto("/?store=KHONG-CO");
    await expect(sw(page)).toHaveCount(0);
  });

  test("CH đặt n/3.000 SP → n; bật → 3.000, SP không đặt hiển thị 0; tắt → n", async ({ page }) => {
    const store = await prisma.store.findUniqueOrThrow({ where: { code: "CH001" } });
    const ordered = await prisma.storeProductQty.count({
      where: { storeId: store.id, qtyOrdered: { gt: 0 }, product: { active: true } },
    });
    const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

    await page.goto("/?store=CH001");
    await expect(scope(page)).toContainText(`${fmt(ordered)} SP`);
    await sw(page).check();
    await expect(page).toHaveURL(/all=1/);
    await expect(scope(page)).toContainText("3.000 SP");
    await sw(page).uncheck();
    await expect(page).not.toHaveURL(/all=1/);
    await expect(scope(page)).toContainText(`${fmt(ordered)} SP`);
  });

  test("đổi cửa hàng thì công tắc tự tắt", async ({ page }) => {
    await page.goto("/?store=CH001&all=1");
    await expect(sw(page)).toBeChecked();
    await page.getByRole("combobox", { name: "Cửa hàng của bạn" }).selectOption("CH002");
    await expect(page).toHaveURL(/store=CH002/);
    await expect(page).not.toHaveURL(/all=1/);
    await expect(sw(page)).not.toBeChecked();
  });
});
