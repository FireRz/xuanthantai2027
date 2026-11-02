import { expect, test } from "@playwright/test";

test("/robots.txt chặn toàn bộ (T02.8)", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const text = await res.text();
  expect(text).toMatch(/User-Agent: \*/i);
  expect(text).toMatch(/Disallow: \//);
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
