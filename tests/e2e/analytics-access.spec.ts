import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { clearViewerPassword, setViewerPassword } from "../../src/server/auth/viewer-pass";
import { assertLocalDatabase, createTestAdmin, login } from "./helpers";

// Quyền vào /phan-tich: admin vào thẳng (P1) và trạng thái "chưa mở" khi chưa đặt mật khẩu xem (P7).
// Spec này đổi mật khẩu xem chung nên chạy trong project *-admin (sau mobile/desktop, xem playwright.config.ts)
// để không đụng mật khẩu dùng chung có đếm tham chiếu của analytics.spec.ts. Hai project admin chạy song song
// cùng DB, nên chỉ chạy ở desktop-admin; mobile-admin bỏ qua.
test.describe.configure({ mode: "serial" });
test.skip(
  ({ isMobile }) => isMobile,
  "Chỉ chạy một project để không giẫm lên trạng thái mật khẩu chung",
);

test.beforeAll(async () => {
  assertLocalDatabase();
  await clearViewerPassword();
});
test.afterAll(async () => {
  await clearViewerPassword();
  await prisma.$disconnect();
});

test.describe("quyền vào /phan-tich", () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  test.beforeAll(async () => {
    admin = await createTestAdmin();
  });
  test.afterAll(async () => {
    await admin.cleanup();
  });

  test("chưa đặt mật khẩu xem, chưa đăng nhập → 'Trang phân tích chưa mở', không có form", async ({
    page,
  }) => {
    await clearViewerPassword();
    await page.goto("/phan-tich");
    await expect(page.getByTestId("analytics-closed")).toBeVisible();
    await expect(page.getByText("Trang phân tích chưa mở")).toBeVisible();
    await expect(page.getByTestId("viewer-password-form")).toHaveCount(0);
    await expect(page.locator("input[name=password]")).toHaveCount(0);
    await expect(page.getByTestId("summary-tiles")).toHaveCount(0);
  });

  test("admin đăng nhập, không có cookie xem → vào thẳng, kể cả khi chưa đặt mật khẩu xem", async ({
    page,
  }) => {
    await clearViewerPassword();
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    expect((await page.context().cookies()).some((c) => c.name === "xtt_view")).toBe(false);
    await page.goto("/phan-tich");
    await expect(page.getByTestId("summary-tiles")).toBeVisible();
    await expect(page.getByTestId("analytics-closed")).toHaveCount(0);
  });

  test("admin đăng nhập, không có cookie xem, mật khẩu xem ĐÃ đặt → vẫn vào thẳng, không thấy form", async ({
    page,
  }) => {
    await setViewerPassword("xem-quyen-admin-2027");
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    expect((await page.context().cookies()).some((c) => c.name === "xtt_view")).toBe(false);
    await page.goto("/phan-tich");
    await expect(page.getByTestId("summary-tiles")).toBeVisible();
    await expect(page.getByTestId("viewer-password-form")).toHaveCount(0);
  });
});
