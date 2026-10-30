import { expect, test } from "@playwright/test";

test("/api/health trả 200 khi có CSDL", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok", db: "ok" });
});
