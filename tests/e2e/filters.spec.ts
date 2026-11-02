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

test.describe("T04.9 đồng bộ URL", () => {
  test("sao chép URL → tab mới cho cùng kết quả và cùng trạng thái điều khiển", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "Bộ lọc nhãn dạng chip chỉ có trên máy tính");
    await page.goto("/");
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^An Khang/ })
      .click();
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^Phúc Lộc/ })
      .click();
    await page.getByRole("combobox", { name: "Cửa hàng của bạn" }).selectOption("CH003");
    await page.getByRole("switch", { name: "Xem tất cả SP" }).check();
    await page.getByTestId("sort-menu").selectOption("price_desc");
    await page.getByRole("searchbox", { name: "Tìm mã SP" }).fill("0");
    await expect(page).toHaveURL(/q=0/);
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(page).toHaveURL(/all=1/);
    await expect(page.getByTestId("scope-label")).toContainText("CH003");
    const label = await page.getByTestId("scope-label").innerText();
    const skus = await page
      .getByTestId("product-card")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-sku")));

    const other = await context.newPage();
    await other.goto(page.url());
    await expect(other.getByTestId("scope-label")).toHaveText(label);
    expect(
      await other
        .getByTestId("product-card")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-sku"))),
    ).toEqual(skus);
    await expect(other.getByTestId("sort-menu")).toHaveValue("price_desc");
    await expect(other.getByRole("switch", { name: "Xem tất cả SP" })).toBeChecked();
    await expect(other.getByRole("searchbox", { name: "Tìm mã SP" })).toHaveValue("0");
    await expect(
      other.getByTestId("filter-bar").getByRole("button", { name: /^An Khang/ }),
    ).toHaveAttribute("aria-pressed", "true");

    // Tải lại cũng giữ nguyên
    await other.reload();
    await expect(other.getByTestId("scope-label")).toHaveText(label);
    await other.close();
  });

  test("link có dòng không thuộc nhãn đang chọn → dòng đó bị bỏ, kết quả vẫn là cả nhãn", async ({
    page,
  }) => {
    const ak = await prisma.brand.findFirstOrThrow({ where: { name: "An Khang" } });
    const pl = await prisma.brand.findFirstOrThrow({ where: { name: "Phúc Lộc" } });
    const lineOfPl = await prisma.productLine.findFirstOrThrow({ where: { brandId: pl.id } });
    await page.goto(`/?brand=${ak.id}&line=${lineOfPl.id}`);
    await expect(page.getByTestId("scope-label")).toContainText("1.000 SP");
    await expect(page.getByRole("button", { name: /^Bỏ lọc Dòng hàng/ })).toHaveCount(0);
  });

  test("tham số rác trên URL bị bỏ, trang vẫn chạy", async ({ page }) => {
    await page.goto("/?brand=abc&line=%27%3B--&sort=bậy&view=x&n=-5&store=");
    await expect(page.getByTestId("scope-label")).toContainText("3.000 SP");
    await expect(page.getByTestId("product-card").first()).toBeVisible();
  });
});

test.describe("T04.10 số kết quả và trạng thái không có SP phù hợp", () => {
  test("số kết quả theo bộ lọc; 0 kết quả → thông báo, Xóa lọc về toàn bộ và giữ kiểu sắp xếp", async ({
    page,
  }) => {
    await page.goto("/?q=ak00&sort=price_asc");
    await expect(scope(page)).toContainText("Tổng hệ thống · 99 SP");
    await expect(scope(page)).toHaveAttribute("role", "status");

    await page.goto("/?q=zzz-khong-co&sort=price_asc");
    await expect(scope(page)).toContainText("0 SP");
    const empty = page.getByTestId("empty-state");
    await expect(empty).toContainText("Không có sản phẩm phù hợp");
    await expect(cards(page)).toHaveCount(0);
    await empty.getByRole("link", { name: "Xóa lọc" }).click();
    await expect(scope(page)).toContainText("3.000 SP");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page).not.toHaveURL(/q=/);
    await expect(cards(page).first()).toBeVisible();
  });

  test("đang xem một cửa hàng mà không có SP: gợi ý bật 'Xem tất cả SP'", async ({ page }) => {
    await page.goto("/?store=CH001&q=zzz-khong-co");
    await expect(page.getByTestId("empty-state")).toContainText("Xem tất cả SP");
    await page.goto("/?store=CH001&q=zzz-khong-co&all=1");
    await expect(page.getByTestId("empty-state")).not.toContainText("Xem tất cả SP");
  });

  test("tổ hợp lọc không có SP: số đếm trong bộ lọc về 0 và vẫn bỏ được từng bộ lọc", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Bộ lọc nhãn dạng chip chỉ có trên máy tính");
    await page.goto("/?q=ak00");
    await page
      .getByTestId("filter-bar")
      .getByRole("button", { name: /^Phúc Lộc/ })
      .click();
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await page.getByRole("button", { name: /^Bỏ lọc Nhãn hàng: Phúc Lộc/ }).click();
    await expect(scope(page)).toContainText("99 SP");
  });
});

test.describe("Khung giá (ADR-010)", () => {
  const prChip = (page: Page, name: string) =>
    page
      .getByRole("group", { name: "Khung giá" })
      .getByRole("button", { name: new RegExp(`^${name}`) });

  test("máy tính: hàng chip theo thứ tự khoảng giá, chọn nhiều (HOẶC), số đếm khớp kết quả", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hàng chip chỉ có trên máy tính");
    await page.goto("/");
    const names = await page
      .getByRole("group", { name: "Khung giá" })
      .getByRole("button")
      .evaluateAll((els) => els.map((e) => e.firstChild?.textContent?.trim()));
    expect(names.slice(0, 3)).toEqual(["< 1tr", "1tr < 1.5tr", "1.5tr < 2tr"]);

    const ranges = await prisma.priceRange.findMany({ orderBy: { sortOrder: "asc" } });
    expect(names).toEqual(ranges.map((r) => r.name));

    const countOf = async (name: string) =>
      prisma.product.count({
        where: {
          active: true,
          priceRange: { name },
          brand: { active: true },
          productLine: { active: true },
        },
      });
    const [a, b] = [ranges[3], ranges[5]]; // 2tr < 5tr và 7tr < 10tr
    await prChip(page, a.name).click();
    await expect(page).toHaveURL(/pr=/);
    await expect(scope(page)).toContainText(
      `${new Intl.NumberFormat("vi-VN").format(await countOf(a.name))} SP`,
    );
    await prChip(page, b.name).click();
    const sum = (await countOf(a.name)) + (await countOf(b.name));
    await expect(scope(page)).toContainText(`${new Intl.NumberFormat("vi-VN").format(sum)} SP`);
    // Mọi thẻ đang hiện đều có giá (SP chưa có khung giá bị ẩn khi lọc khung giá)
    const prices = await cards(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-price")),
    );
    expect(prices.every((p) => p !== "")).toBe(true);

    await page.getByTestId("clear-filters").click();
    await expect(page).not.toHaveURL(/pr=/);
  });

  test("điện thoại: nhóm Khung giá trong bảng lọc; Lọc (n) tính cả khung giá", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Chỉ điện thoại");
    await page.goto("/");
    await page.getByTestId("open-filter-sheet").click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet.getByText("Khung giá", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: /^2tr < 5tr/ }).click();
    await expect(page).toHaveURL(/pr=/);
    await sheet.getByTestId("sheet-apply").click();
    await expect(page.getByTestId("filter-count")).toHaveText("(1)");
  });

  test("mở link có pr: giữ nguyên; id khung giá lạ bị bỏ", async ({ page }) => {
    const r = await prisma.priceRange.findFirstOrThrow({ orderBy: { sortOrder: "asc" } });
    await page.goto(`/?pr=${r.id}`);
    const total = await scope(page).innerText();
    await page.goto(`/?pr=${r.id},00000000-0000-4000-8000-000000000000`);
    await expect(scope(page)).toHaveText(total);
  });
});

test.describe("Khớp mockup (docs/mockups)", () => {
  test("máy tính: chip 'Tất cả nhãn' kèm tổng, bật khi chưa chọn nhãn, bấm để bỏ chọn nhãn", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hàng chip chỉ có trên máy tính");
    await page.goto("/");
    const all = page.getByRole("button", { name: /^Tất cả nhãn/ });
    await expect(all).toHaveText("Tất cả nhãn3.000");
    await expect(all).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^An Khang/ }).click();
    await expect(all).toHaveAttribute("aria-pressed", "false");
    await expect(all).toHaveText("Tất cả nhãn3.000"); // tổng tính trên các bộ lọc khác, không trên nhãn
    await all.click();
    await expect(page).not.toHaveURL(/brand=/);
    await expect(all).toHaveAttribute("aria-pressed", "true");
  });

  test("nút sắp xếp dạng chip: 'Sắp xếp: Mã SP A→Z' (máy tính) / 'Mã SP A→Z' (điện thoại), đổi được", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const pill = page.getByTestId("sort-menu").locator("xpath=..");
    await expect(pill.locator("> span:visible")).toHaveText(
      isMobile ? ["Mã SP A→Z"] : ["Sắp xếp:", "Mã SP A→Z"],
    );
    await page.getByTestId("sort-menu").selectOption("price_desc");
    await expect(pill.locator("> span:visible").last()).toHaveText("Giá cao → thấp");
    await expect(page).toHaveURL(/sort=price_desc/);
  });

  test("điện thoại: bảng lọc có nhóm Sắp xếp dạng chip", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Chỉ điện thoại");
    await page.goto("/");
    await page.getByTestId("open-filter-sheet").click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet.getByText("Sắp xếp", { exact: true })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Mã SP A→Z" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sheet.getByRole("button", { name: "Còn thiếu nhiều nhất" }).click();
    await expect(page).toHaveURL(/sort=shortage/);
    await expect(sheet.getByRole("button", { name: "Còn thiếu nhiều nhất" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

test.describe("Điện thoại: chip Dòng nhanh (mockup)", () => {
  test("chip Dòng ▾ cạnh nút Lọc, chọn được ngay không cần mở bảng lọc", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Chỉ điện thoại");
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Bộ sưu tập/ })).toHaveCount(0); // chỉ chip Dòng
    await page.getByRole("button", { name: /^Dòng hàng/ }).click();
    const panel = page.getByRole("group", { name: "Dòng hàng" });
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await panel.getByRole("checkbox").first().check();
    await expect(page).toHaveURL(/line=/);
    await expect(page.getByTestId("filter-count")).toHaveText("(1)");
  });
});
