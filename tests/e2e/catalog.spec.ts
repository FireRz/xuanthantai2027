import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";

// Chạy trên DB dev đã seed (npm run seed hoặc seed:large): ≥ 100 SP, ≥ 2 cửa hàng, có BST.

const cards = (page: Page) => page.getByTestId("product-card");
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.afterAll(() => prisma.$disconnect());

test.describe("T03.3–T03.4 trang danh mục", () => {
  test("thấy banner, SP seed, không cuộn ngang", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Xuân Đinh Mùi · 2027");
    await expect(cards(page).first()).toBeVisible();
    expect(await cards(page).count()).toBe(24);
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("số cột: điện thoại 2, máy tính 4", async ({ page, isMobile }) => {
    await page.goto("/");
    const perRow = async () => {
      const tops = await page
        .getByTestId("product-grid")
        .locator("> li")
        .evaluateAll((els) =>
          els.slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().top)),
        );
      return tops.filter((t) => t === tops[0]).length;
    };
    // Chờ CSS áp dụng xong (lần chạy đầu sau khi dev server biên dịch lại có thể chậm).
    await expect.poll(perRow).toBe(isMobile ? 2 : 4);
  });
});

test.describe("T03.5 xem thêm", () => {
  test("không trùng, không sót giữa các lần tải", async ({ page }) => {
    await page.goto("/");
    const skus = () => cards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-sku")));
    const first = await skus();
    await page.getByRole("link", { name: "Xem thêm" }).click();
    await expect(cards(page)).toHaveCount(48);
    const second = await skus();
    expect(second.slice(0, 24)).toEqual(first);
    expect(new Set(second).size).toBe(48);
    expect([...second].sort()).toEqual(second); // Mã A→Z liên tục, không sót
  });
});

test.describe("T03.6 trạng thái rỗng", () => {
  test("không có SP khớp → thông báo và nút Xóa lọc", async ({ page }) => {
    await page.goto("/?q=KHONG-CO-MA-NAY");
    await expect(page.getByTestId("empty-state")).toContainText(
      "Không tìm thấy mã “KHONG-CO-MA-NAY”",
    );
    await page.getByRole("link", { name: "Xóa lọc" }).click();
    await expect(cards(page).first()).toBeVisible();
  });
});

test.describe("T03.8, T03.12 cửa hàng và phạm vi", () => {
  test("chọn cửa hàng → nhãn phạm vi và số liệu đổi theo cửa hàng", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("scope-label")).toContainText("Tất cả cửa hàng");
    const total = await cards(page).first().innerText();
    await page.getByLabel("Cửa hàng của bạn").selectOption({ index: 1 });
    await expect(page).toHaveURL(/store=/);
    await expect(page.getByTestId("scope-label")).toContainText("Cửa hàng");
    await expect(cards(page).first()).not.toHaveText(total);
  });

  test("thanh cửa hàng luôn thấy khi cuộn (điện thoại: chỉ còn hàng tìm mã, ADR-009 U14'')", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 1500));
    const top = await page.getByTestId("store-bar").evaluate((e) => e.getBoundingClientRect().top);
    await expect(page.getByLabel("Tìm mã SP")).toBeInViewport();
    if (isMobile) {
      expect(Math.round(top)).toBeLessThan(0);
      await expect(page.getByLabel("Cửa hàng của bạn")).not.toBeInViewport();
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.getByLabel("Cửa hàng của bạn")).toBeInViewport();
    } else {
      expect(Math.round(top)).toBe(0);
      await expect(page.getByLabel("Cửa hàng của bạn")).toBeInViewport();
    }
  });

  test("tìm theo mã (nút Tìm)", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Tìm mã SP").fill("ak0001");
    await page.getByRole("button", { name: "Tìm", exact: true }).click();
    await expect(page).toHaveURL(/q=ak0001/);
    await expect(cards(page).first()).toHaveAttribute("data-sku", "AK0001");
  });
});

test.describe("T03.11 Lưới ↔ Bảng", () => {
  test("chuyển Bảng giữ cửa hàng và dữ liệu; điện thoại không cuộn ngang cả trang", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Cửa hàng của bạn").selectOption({ index: 1 });
    await expect(page).toHaveURL(/store=/);
    await expect(page.getByTestId("scope-label")).toContainText("Cửa hàng");
    const gridSkus = await cards(page).evaluateAll((e) => e.map((x) => x.getAttribute("data-sku")));
    await page.getByRole("link", { name: "Bảng" }).click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/store=/);
    await expect(page.getByTestId("product-table")).toBeVisible();
    const rowSkus = await page
      .getByTestId("product-row")
      .evaluateAll((e) => e.map((x) => x.getAttribute("data-sku")));
    expect(rowSkus).toEqual(gridSkus);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole("link", { name: "Lưới" }).click();
    await expect(page.getByTestId("product-grid")).toBeVisible();
  });
});

test.describe("T03.7 ảnh", () => {
  test("danh mục chỉ tải thumbnail, không tải ảnh lớn", async ({ page }) => {
    const sku = "AK0001";
    const before = await prisma.product.findUniqueOrThrow({ where: { sku } });
    await prisma.product.update({
      where: { sku },
      data: {
        thumbUrl: "https://img.test.invalid/thumb-AK0001.png",
        imageUrl: "https://img.test.invalid/large-AK0001.png",
      },
    });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );
    const requested: string[] = [];
    await page.route("https://img.test.invalid/**", (route) => {
      requested.push(route.request().url());
      return route.fulfill({ contentType: "image/png", body: png });
    });
    try {
      await page.goto("/?q=AK0001");
      await expect(cards(page).first().locator("img")).toHaveAttribute("loading", /lazy|eager/);
      await page.waitForLoadState("networkidle");
      expect(requested).toEqual(["https://img.test.invalid/thumb-AK0001.png"]);
    } finally {
      await prisma.product.update({
        where: { sku },
        data: { thumbUrl: before.thumbUrl, imageUrl: before.imageUrl },
      });
    }
  });
});

test.describe("ADR-009 U8'' pill bộ lọc", () => {
  test("máy tính 36px và đều hàng; điện thoại giữ vùng chạm 44px", async ({ page }, testInfo) => {
    await page.goto("/");
    const height = async (l: ReturnType<typeof page.locator>) =>
      Math.round((await l.boundingBox())!.height);
    if (testInfo.project.name.startsWith("mobile")) {
      expect(await height(page.getByTestId("open-filter-sheet"))).toBeGreaterThanOrEqual(44);
      return;
    }
    const bar = page.getByTestId("filter-bar");
    expect(await height(bar.getByRole("button", { name: "Nhãn hàng" }))).toBe(36);
    expect(await height(bar.locator("label", { hasText: "Sắp xếp" }))).toBe(36);
  });
});

test.describe("T03.14 chân trang", () => {
  test("hiện đúng thời điểm dữ liệu thay đổi gần nhất (giờ Việt Nam)", async ({ page }) => {
    const [{ at }] = await prisma.$queryRaw<{ at: Date }[]>`
      SELECT GREATEST((SELECT MAX(updated_at) FROM product),
                      (SELECT MAX(updated_at) FROM store_product_qty)) AS at`;
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(at)
        .map((x) => [x.type, x.value]),
    );
    await page.goto("/");
    const footer = page.getByTestId("data-updated");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toContainText(`${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`);
    await expect(footer).toContainText("Dữ liệu cập nhật lần cuối");
  });

  test("chân trang: 'Phòng Cung Ứng' ngay dưới tên chi nhánh, chữ nhỏ hơn", async ({ page }) => {
    await page.goto("/");
    const dept = page.getByTestId("footer-department");
    await dept.scrollIntoViewIfNeeded();
    await expect(dept).toHaveText("Phòng Cung Ứng");
    const branch = page.getByText("CN Miền Tây", { exact: true });
    const [b, d] = [(await branch.boundingBox())!, (await dept.boundingBox())!];
    expect(d.y).toBeGreaterThan(b.y + b.height - 2);
    const size = (l: typeof dept) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(await size(dept)).toBeLessThan(await size(branch));
  });

  test("chân trang: cùng màu đỏ với banner, gọn, nút Lên đầu trang không che nội dung", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const footer = page.locator("footer");
    const background = (l: typeof footer) => l.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await background(footer)).toBe(await background(page.locator("header").first()));

    const backToTop = page.getByTestId("back-to-top");
    const isMobile = testInfo.project.name.startsWith("mobile");
    // Điện thoại đo nhiều khổ: cách các dòng xuống hàng đổi theo chiều rộng.
    for (const width of isMobile ? [360, 375, 430, 600] : [1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(backToTop).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

      const { height } = (await footer.boundingBox())!;
      expect(height, `cao ở khổ ${width}px`).toBeLessThanOrEqual(isMobile ? 200 : 120);

      const b = (await backToTop.boundingBox())!;
      for (const item of await footer.locator("a, time, b, img").all()) {
        const r = await item.boundingBox();
        if (!r) continue;
        const overlaps =
          r.x < b.x + b.width &&
          r.x + r.width > b.x &&
          r.y < b.y + b.height &&
          r.y + r.height > b.y;
        expect(overlaps, `${await item.innerText()} ở khổ ${width}px`).toBe(false);
      }
    }
  });
});
