import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../../src/server/db";

// Chế độ Chỉ xem hình (?xem=hinh). Chạy trên DB dev đã seed (npm run seed).

const cards = (page: Page) => page.getByTestId("product-card");
const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const photoToggle = (page: Page) => page.getByRole("switch", { name: "Chỉ xem hình" });

test.afterAll(() => prisma.$disconnect());

test.describe("chế độ Chỉ xem hình", () => {
  test("/?xem=hinh: thẻ không có progressbar, không có nút Xuất Excel", async ({ page }) => {
    await page.goto("/?xem=hinh");
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByTestId("export-button")).toHaveCount(0);
    await expect(page.getByTestId("export-button-mobile")).toHaveCount(0);
    await expect(page.getByTestId("export-menu")).toHaveCount(0);
    await expect(photoToggle(page)).toHaveAttribute("aria-checked", "true");

    // Chế độ đầy đủ vẫn có progressbar (đối chứng)
    await page.goto("/");
    await expect(page.getByRole("progressbar").first()).toBeVisible();
  });

  test("lần đầu vào: bong bóng gợi ý cạnh công tắc, không che bấm; lần sau không tự hiện", async ({
    page,
  }) => {
    await page.goto("/");
    const hint = page.getByTestId("photo-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Ẩn số đặt, về, bán, tồn");
    expect(await noHorizontalScroll(page)).toBe(true);
    // Bong bóng không nhận chuột: bấm công tắc được ngay.
    await photoToggle(page).click();
    await expect(page).toHaveURL(/xem=hinh/);
    await page.mouse.move(5, 600); // máy tính: rê chuột ra khỏi công tắc thì gợi ý tắt
    await expect(hint).toBeHidden();

    await page.goto("/");
    await expect(photoToggle(page)).toBeVisible();
    await expect(page.getByTestId("photo-hint")).toBeHidden();
  });

  /** Bong bóng nằm trọn trong khổ `width`, ngay dưới công tắc, mũi tên chỉ vào công tắc. */
  async function expectHintFits(page: Page, width: number) {
    const m = await page.evaluate(() => {
      const hint = document.querySelector('[data-testid="photo-hint"]')!;
      const h = hint.getBoundingClientRect();
      const s = document.querySelector('[data-testid="photo-switch"]')!.getBoundingClientRect();
      const arrow = getComputedStyle(hint, "::before");
      const border = parseFloat(getComputedStyle(hint).borderRightWidth);
      const arrowX = h.right - border - parseFloat(arrow.right) - parseFloat(arrow.width) / 2;
      return {
        hint: { left: h.left, right: h.right, top: h.top, bottom: h.bottom },
        sw: { left: s.left, right: s.right, bottom: s.bottom },
        arrowX,
        innerHeight: window.innerHeight,
      };
    });
    const at = `khổ ${width}px: ${JSON.stringify(m)}`;
    expect(m.hint.left, at).toBeGreaterThanOrEqual(0);
    expect(m.hint.right, at).toBeLessThanOrEqual(width);
    expect(m.hint.top, at).toBeGreaterThanOrEqual(m.sw.bottom);
    expect(m.hint.bottom, at).toBeLessThanOrEqual(m.innerHeight);
    expect(m.arrowX, at).toBeGreaterThanOrEqual(m.sw.left);
    expect(m.arrowX, at).toBeLessThanOrEqual(m.sw.right);
  }

  test("768×1024, đã cuộn xuống: bong bóng lần đầu nằm trọn trong màn hình, mũi tên chỉ công tắc", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    // Không chờ "load": máy chủ dev biên dịch lần đầu có thể lâu hơn lúc gợi ý tự tắt (9 giây).
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByTestId("photo-hint")).toBeVisible({ timeout: 25_000 });
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.getByTestId("photo-hint")).toBeVisible();
    await expectHintFits(page, 768);
  });

  for (const [mode, url] of [
    ["công tắc tắt", "/"],
    ["công tắc bật", "/?xem=hinh"],
  ] as const)
    test(`mọi khổ 320–1920px (${mode}): bong bóng không tràn mép, mũi tên chỉ công tắc`, async ({
      page,
    }) => {
      await page.goto(url);
      await expect(page.getByTestId("photo-switch")).toBeVisible();
      // Giữ bong bóng hiện suốt lúc đổi khổ (gợi ý thật tự tắt sau vài giây, rê chuột chỉ có từ md).
      await page.addStyleTag({
        content: '[data-testid="photo-hint"] { display: block !important; }',
      });
      await page.evaluate(() => window.scrollTo(0, 800));
      for (let width = 320; width <= 1920; width += width < 1100 ? 20 : 100) {
        await page.setViewportSize({ width, height: 900 });
        await expectHintFits(page, width);
      }
      await page.setViewportSize({ width: 1920, height: 900 });
      await expectHintFits(page, 1920);
    });

  test("bấm Chỉ xem hình → URL có xem=hinh; lọc tìm mã vẫn giữ; bấm lại → mất xem=hinh", async ({
    page,
  }) => {
    await page.goto("/");
    await photoToggle(page).click();
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(photoToggle(page)).toHaveAttribute("aria-checked", "true");

    await page.getByRole("searchbox", { name: "Tìm mã SP" }).pressSequentially("ak00", {
      delay: 60,
    });
    await expect(page).toHaveURL(/q=ak00/);
    await expect(page).toHaveURL(/xem=hinh/);
    await expect(page.getByRole("progressbar")).toHaveCount(0);

    await photoToggle(page).click();
    await expect(page).not.toHaveURL(/xem=hinh/);
    await expect(page).toHaveURL(/q=ak00/);
    await expect(photoToggle(page)).toHaveAttribute("aria-checked", "false");
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
    // Popup đã gắn xong (đã gửi lần tải sẵn SP kế bên) rồi mới bấm phím — máy chậm dễ bấm hụt.
    const warm = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/product-view");
    await cards(page).nth(2).click();
    await expect(detail(page)).toHaveAttribute("data-sku", start);
    await warm;

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

  test("chuyển SP không dựng lại cả trang (chỉ gọi /api/product-view), mã kế bên được tải sẵn", async ({
    page,
  }) => {
    await page.goto("/");
    const [first, second, third] = [
      await skuAt(page, 0),
      await skuAt(page, 1),
      await skuAt(page, 2),
    ];
    const pageRequests: string[] = [];
    const apiRequests: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.searchParams.has("_rsc") || r.headers()["rsc"] === "1") pageRequests.push(r.url());
      if (u.pathname === "/api/product-view") apiRequests.push(u.searchParams.get("sp") ?? "");
    });
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    // Mở popup: mã sau được tải sẵn ở chế độ nền.
    await expect.poll(() => apiRequests).toContain(second);
    pageRequests.length = 0;
    await nextButton(page).click();
    await expect(detail(page)).toHaveAttribute("data-sku", second);
    await expect(page).toHaveURL(new RegExp(`sp=${second}`));
    await expect.poll(() => apiRequests).toContain(third);
    expect(pageRequests).toEqual([]);
  });

  test("máy tính: nút Sản phẩm trước/sau nằm ngoài khung popup, không đè lên ảnh", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "điện thoại: mũi tên nằm cạnh số thứ tự");
    await page.goto("/");
    await cards(page).nth(1).click();
    await expect(detail(page)).toBeVisible();
    const card = (await page.getByTestId("product-dialog-card").boundingBox())!;
    const next = (await nextButton(page).boundingBox())!;
    const prev = (await prevButton(page).boundingBox())!;
    expect(next.x).toBeGreaterThanOrEqual(card.x + card.width);
    expect(prev.x + prev.width).toBeLessThanOrEqual(card.x);
    // Bấm vùng nền cạnh nút vẫn đóng popup (đợi ảnh bay xong: lúc đang bay cú bấm không tới trang).
    await expect(page.locator("html")).not.toHaveAttribute("data-hero-morph");
    await page.mouse.click(next.x + next.width / 2, card.y + card.height - 10);
    await expect(page.getByTestId("product-dialog")).toHaveCount(0);
  });

  test("điện thoại: mũi tên trước/sau nằm cạnh số thứ tự, không nằm trên ảnh", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "chỉ điện thoại");
    await page.goto("/");
    await cards(page).nth(1).click();
    await expect(detail(page)).toBeVisible();
    // Đo sau khi popup trượt lên xong (các lần đo cách nhau vài khung hình khi máy chậm).
    await page
      .getByTestId("product-dialog")
      .evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const pos = (await page.getByTestId("product-position").boundingBox())!;
    const next = (await nextButton(page).boundingBox())!;
    const img = (await detail(page).getByRole("img").first().boundingBox())!;
    expect(Math.abs(next.y + next.height / 2 - (pos.y + pos.height / 2))).toBeLessThan(6);
    expect(next.y).toBeGreaterThanOrEqual(img.y + img.height - 1);
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

  // Lướt kiểu album: phần nội dung lướt mang data-motion trong lúc chạy hiệu ứng.
  const content = (page: Page) => page.getByTestId("swipe-content");
  const peek = (page: Page) => page.getByTestId("swipe-peek");
  const transformOf = (page: Page) =>
    content(page).evaluate((el) => getComputedStyle(el).transform);

  test("bấm Sản phẩm sau: SP cũ trượt ra rồi SP mới trượt vào; xong thì đứng yên", async ({
    page,
  }) => {
    await page.goto("/");
    const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await expect(content(page)).not.toHaveAttribute("data-motion");

    await nextButton(page).click();
    await expect(content(page)).toHaveAttribute("data-motion", /exit-next|enter-next/);
    await expect(detail(page)).toHaveAttribute("data-sku", second);
    await expect(content(page)).not.toHaveAttribute("data-motion");
    expect(await transformOf(page)).toBe("none");
    await expect(peek(page)).toHaveCount(0);
  });

  test("SP đầu: phím ← → khung lắc (edge-prev), mã không đổi", async ({ page }) => {
    await page.goto("/");
    const first = await skuAt(page, 0);
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await page.keyboard.press("ArrowLeft");
    await expect(content(page)).toHaveAttribute("data-motion", "edge-prev");
    await expect(content(page)).not.toHaveAttribute("data-motion");
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await expect(page).toHaveURL(new RegExp(`sp=${first}`));
    expect(await transformOf(page)).toBe("none");
  });

  test("bấm → 5 lần liên tiếp nhanh → dừng ở mã thứ 6 của lưới, không kẹt transform", async ({
    page,
  }) => {
    await page.goto("/");
    const [first, sixth] = [await skuAt(page, 0), await skuAt(page, 5)];
    // Chờ lần tải sẵn đầu tiên xong (máy chủ dev biên dịch API lần đầu có thể mất vài giây).
    const warm = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/product-view");
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await warm;
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect(detail(page)).toHaveAttribute("data-sku", sixth);
    await expect(page).toHaveURL(new RegExp(`sp=${sixth}`));
    await expect(page.getByTestId("product-position")).toHaveText(/^6 \/ \d/);
    await expect(content(page)).not.toHaveAttribute("data-motion");
    expect(await transformOf(page)).toBe("none");
    // Đứng yên hẳn: không lùi/nhảy thêm sau đó.
    await page.waitForTimeout(800);
    await expect(detail(page)).toHaveAttribute("data-sku", sixth);
  });

  test("mạng chậm: API trễ 800 ms → sau khi trượt ra vẫn có swipe-peek, rồi hiện đúng SP", async ({
    page,
  }) => {
    await page.goto("/");
    const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
    // API của SP sau trả về 800 ms sau lúc bấm (kể cả lần tải sẵn đã gửi từ lúc mở popup).
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    await page.route(
      (u) => u.pathname === "/api/product-view" && u.searchParams.get("sp") === second,
      async (r) => {
        await gate;
        await r.continue();
      },
    );
    await cards(page).first().click();
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await nextButton(page).click();
    setTimeout(release, 800);
    // Đã trượt ra hết nhưng dữ liệu chưa về: lớp ló ra của SP đích chiếm chỗ.
    await page.waitForTimeout(300);
    await expect(detail(page)).toHaveAttribute("data-sku", first);
    await expect(peek(page)).toBeVisible();
    await expect(peek(page)).toHaveAttribute("data-dir", "next");
    await expect(detail(page)).toHaveAttribute("data-sku", second);
    await expect(page).toHaveURL(new RegExp(`sp=${second}`));
    await expect(content(page)).not.toHaveAttribute("data-motion");
    await expect(peek(page)).toHaveCount(0);
    expect(await transformOf(page)).toBe("none");
  });

  for (const photo of [true, false])
    test(`${photo ? "chế độ hình" : "chế độ thường"}, mạng chậm: lớp ló ra (ảnh SP đích) to bằng ảnh thật trong popup`, async ({
      page,
      isMobile,
    }) => {
      await page.goto(photo ? "/?xem=hinh" : "/");
      const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
      let release!: () => void;
      const gate = new Promise<void>((res) => (release = res));
      await page.route(
        (u) => u.pathname === "/api/product-view" && u.searchParams.get("sp") === second,
        async (r) => {
          await gate;
          await r.continue().catch(() => {});
        },
      );
      await cards(page).first().click();
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      await expect(page.locator("html")).not.toHaveAttribute("data-hero-morph");
      const real = (await detail(page).locator("[data-hero]").boundingBox())!;
      await nextButton(page).click();
      await expect(peek(page)).toBeVisible();
      const ghost = (await peek(page).locator(":scope > *").first().boundingBox())!;
      release();
      expect(Math.abs(ghost.width - real.width)).toBeLessThan(2);
      expect(Math.abs(ghost.height - real.height)).toBeLessThan(2);
      if (isMobile && !photo && real.height <= page.viewportSize()!.height * 0.3 + 1)
        // Ảnh thật bị giới hạn 30% chiều cao màn hình → lớp ló ra cũng vậy.
        expect(ghost.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.3 + 1);
      await expect(detail(page)).toHaveAttribute("data-sku", second);
    });

  for (const outcome of ["ok", "error"] as const)
    test(`đóng popup (Esc) khi đang chuyển SP, API về sau (${outcome}) → không ghi lại sp=, popup không mở lại`, async ({
      page,
    }) => {
      await page.goto("/?sort=price_asc");
      const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
      let release!: () => void;
      const gate = new Promise<void>((res) => (release = res));
      await page.route(
        (u) => u.pathname === "/api/product-view" && u.searchParams.get("sp") === second,
        async (r) => {
          await gate;
          if (outcome === "ok") await r.continue().catch(() => {});
          else await r.fulfill({ status: 500, body: "lỗi" }).catch(() => {});
        },
      );
      await cards(page).first().click();
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      await expect(page.locator("html")).not.toHaveAttribute("data-hero-morph");
      await nextButton(page).click();
      await expect(content(page)).toHaveAttribute("data-motion", /./); // lần chuyển đã bắt đầu
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("product-dialog")).toHaveCount(0);
      await expect(page).not.toHaveURL(/sp=/);
      release();
      await page.waitForTimeout(1000);
      await expect(page).not.toHaveURL(/sp=/);
      await expect(page).toHaveURL(/sort=price_asc/);
      await expect(page.getByTestId("product-dialog")).toHaveCount(0);
    });

  /**
   * Gần cuối danh sách (tìm theo mã → ít kết quả): mở SP áp chót, API của SP cuối bị giữ lại,
   * bấm → 3 lần nhanh (2 lần sau xếp hàng chờ SP cuối, mà SP cuối không có SP sau)
   * → vẫn hiện SP cuối, không kẹt ở trạng thái chờ/trượt ra.
   */
  async function pressPastEnd(page: Page) {
    await page.goto("/");
    const prefix = (await skuAt(page, 0)).slice(0, -1);
    await page.goto(`/?q=${prefix}`);
    await expect(cards(page).first()).toBeVisible();
    const n = await cards(page).count();
    expect(n).toBeGreaterThanOrEqual(3);
    const [beforeLast, last] = [await skuAt(page, n - 2), await skuAt(page, n - 1)];
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    await page.route(
      (u) => u.pathname === "/api/product-view" && u.searchParams.get("sp") === last,
      async (r) => {
        await gate;
        await r.continue();
      },
    );
    await cards(page)
      .nth(n - 2)
      .click();
    await expect(detail(page)).toHaveAttribute("data-sku", beforeLast);
    await expect(page.getByTestId("product-position")).toHaveText(`${n - 1} / ${n}`);
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500); // giữ API SP cuối lâu hơn thời gian trượt ra
    release();
    await expect(detail(page)).toHaveAttribute("data-sku", last);
    await expect(page).toHaveURL(new RegExp(`sp=${last}`));
    await expect(page.getByTestId("product-position")).toHaveText(`${n} / ${n}`);
    await expect(content(page)).not.toHaveAttribute("data-motion");
    await expect(peek(page)).toHaveCount(0);
    expect(await transformOf(page)).toBe("none");
    // Hết kẹt: bấm → nữa ở SP cuối thì nảy báo hết (giảm chuyển động: không làm gì), mã không đổi.
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(400);
    await expect(detail(page)).toHaveAttribute("data-sku", last);
    await expect(content(page)).not.toHaveAttribute("data-motion");
  }

  test("gần cuối, mạng chậm: bấm → 3 lần nhanh vượt quá SP cuối → dừng ở SP cuối, không kẹt", async ({
    page,
  }) => {
    await pressPastEnd(page);
  });

  test.describe("giảm chuyển động", () => {
    test.use({ reducedMotion: "reduce" });

    test("giảm chuyển động, gần cuối, mạng chậm: bấm → 3 lần nhanh → dừng ở SP cuối", async ({
      page,
    }) => {
      await pressPastEnd(page);
    });

    test("giảm chuyển động: chuyển SP vẫn đúng, không bao giờ có data-motion", async ({ page }) => {
      await page.goto("/");
      const [first, second] = [await skuAt(page, 0), await skuAt(page, 1)];
      await cards(page).first().click();
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      // Ghi lại nếu có khung hình nào mang data-motion.
      await page.evaluate(() => {
        const w = window as unknown as { sawMotion: boolean };
        w.sawMotion = false;
        const tick = () => {
          if (document.querySelector("[data-motion]")) w.sawMotion = true;
          requestAnimationFrame(tick);
        };
        tick();
      });
      await page.keyboard.press("ArrowLeft"); // SP đầu: không nảy
      await nextButton(page).click();
      await expect(detail(page)).toHaveAttribute("data-sku", second);
      await expect(page).toHaveURL(new RegExp(`sp=${second}`));
      await page.keyboard.press("ArrowLeft");
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      await page.waitForTimeout(300);
      expect(
        await page.evaluate(() => (window as unknown as { sawMotion: boolean }).sawMotion),
      ).toBe(false);
    });
  });

  test.describe("điện thoại", () => {
    test.skip(({ isMobile }) => !isMobile, "vuốt cảm ứng chỉ kiểm trên điện thoại");

    test("kéo dở tay: thấy swipe-peek data-dir=next; thả dưới ngưỡng → về chỗ cũ, mã không đổi", async ({
      page,
    }) => {
      await page.goto("/");
      const first = await skuAt(page, 0);
      await page.goto(`/?sp=${first}`);
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      const image = detail(page).getByRole("img").first();
      await expect(image).toBeVisible();
      const box = (await image.boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 9; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x - i * 5, y }],
        });
      await expect(peek(page)).toBeVisible();
      await expect(peek(page)).toHaveAttribute("data-dir", "next");
      // Thả chậm (không phải vuốt nhanh) dưới ngưỡng 60px.
      await page.waitForTimeout(300);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
      await expect(peek(page)).toHaveCount(0);
      await expect.poll(() => transformOf(page)).toBe("none");
      await page.waitForTimeout(400);
      await expect(detail(page)).toHaveAttribute("data-sku", first);
      await expect(page).toHaveURL(new RegExp(`sp=${first}`));
    });

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
