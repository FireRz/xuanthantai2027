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
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Xuân Thần Tài");
    await expect(page.getByRole("heading", { name: "Bộ sưu tập mùa này" })).toBeVisible();
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
    await expect(page.getByTestId("empty-state")).toContainText("Không có sản phẩm phù hợp");
    await page.getByRole("link", { name: "Xóa lọc" }).click();
    await expect(cards(page).first()).toBeVisible();
  });
});

test.describe("T03.8, T03.12 cửa hàng và phạm vi", () => {
  test("chọn cửa hàng → nhãn phạm vi và số liệu đổi theo cửa hàng", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("scope-label")).toContainText("Tổng hệ thống");
    const total = await cards(page).first().innerText();
    await page.getByLabel("Cửa hàng của bạn").selectOption({ index: 1 });
    await expect(page).toHaveURL(/store=/);
    await expect(page.getByTestId("scope-label")).toContainText("Cửa hàng");
    await expect(cards(page).first()).not.toHaveText(total);
  });

  test("thanh cửa hàng luôn thấy khi cuộn", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 1500));
    const top = await page.getByTestId("store-bar").evaluate((e) => e.getBoundingClientRect().top);
    expect(Math.round(top)).toBe(0);
    await expect(page.getByLabel("Cửa hàng của bạn")).toBeInViewport();
  });

  test("tìm theo mã (Xem hàng)", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Tìm mã SP").fill("ak0001");
    await page.getByRole("button", { name: "Xem hàng" }).click();
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

test.describe("T03.13 Bộ sưu tập", () => {
  test("bấm thẻ BST → chỉ còn SP của BST đó; bấm lại → bỏ lọc", async ({ page }) => {
    await page.goto("/");
    const card = page.getByTestId("collection-card").first();
    const count = Number(/(\d[\d.]*) SP/.exec(await card.innerText())![1].replace(/\./g, ""));
    await card.click();
    await expect(page).toHaveURL(/col=/);
    await expect(page.getByTestId("scope-label")).toContainText(
      `${count.toLocaleString("vi-VN")} SP`,
    );
    await expect(page.getByTestId("collection-card").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("collection-card").first().click();
    await expect(page).not.toHaveURL(/col=/);
  });

  test("thẻ Ngoài bộ sưu tập lọc SP không thuộc BST", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-collection="none"]').click();
    await expect(page).toHaveURL(/col=none/);
    await expect(cards(page).first()).toBeVisible();
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
