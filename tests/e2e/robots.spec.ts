import { expect, test } from "@playwright/test";

test("/robots.txt chặn toàn bộ (T02.8)", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toMatch(/User-Agent: \*/i);
  expect(text).toMatch(/Disallow: \//);
});

test("/robots.txt cho máy đọc link đọc trang để dựng ảnh xem trước (ADR-009 U21)", async ({
  request,
}) => {
  const text = await (await request.get("/robots.txt")).text();
  expect(text).toMatch(/User-Agent: SkypeUriPreview[\s\S]*Allow: \//i);
  expect(text).toMatch(/User-Agent: Zalo[\s\S]*Allow: \//i);
  expect(text).not.toMatch(/Googlebot|bingbot/i);
});

test("gửi link: có tiêu đề, mô tả và ảnh xem trước 1200×630 tải được (ADR-009 U21)", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const meta = (property: string) =>
    page.locator(`meta[property="${property}"]`).getAttribute("content");
  expect(await meta("og:title")).toContain("Xuân Thần Tài");
  expect(await meta("og:description")).toBeTruthy();
  expect(await meta("og:image:width")).toBe("1200");
  expect(await meta("og:image:height")).toBe("630");
  const image = await meta("og:image");
  expect(image).toMatch(/^https?:\/\/.+opengraph-image/);
  const res = await request.get(new URL(image!).pathname + new URL(image!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/jpeg");
});

for (const path of ["/", "/login"]) {
  test(`${path} có meta noindex, nofollow (T02.8)`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex, nofollow/,
    );
  });
}
