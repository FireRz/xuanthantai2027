import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { createTestAdmin, login } from "./helpers";

const tag = () => randomBytes(3).toString("hex").toUpperCase();

test.describe("sửa nhanh số lượng (T08.4)", () => {
  test.setTimeout(90_000);
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let brandId = "";
  let storeIds: string[] = [];

  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    await prisma.storeProductQty.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.productLine.deleteMany({ where: { brandId } });
    await prisma.brand.deleteMany({ where: { id: brandId } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
    storeIds = [];
    await admin.cleanup();
  });

  test("sửa SL của CH X cho 3 SP → trang xem (lọc X) hiện số mới, tổng cập nhật", async ({
    page,
  }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn Q${t}` } });
    brandId = brand.id;
    const line = await prisma.productLine.create({ data: { brandId, name: "Nhẫn" } });
    const x = await prisma.store.create({ data: { code: `QX${t}`, name: `Cửa hàng X ${t}` } });
    const y = await prisma.store.create({ data: { code: `QY${t}`, name: `Cửa hàng Y ${t}` } });
    storeIds = [x.id, y.id];
    const skus = [`QT${t}1`, `QT${t}2`, `QT${t}3`];
    const products = [];
    for (const sku of skus) {
      products.push(
        await prisma.product.create({ data: { sku, brandId, productLineId: line.id } }),
      );
    }
    // CH Y đã có 5/5 cho SP đầu: tổng phải cộng cả hai cửa hàng.
    await prisma.storeProductQty.create({
      data: { productId: products[0].id, storeId: y.id, qtyOrdered: 5, qtyReceived: 5 },
    });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/quantities?store=${x.code}&q=QT${t}`);
    await expect(page.getByTestId("qty-row")).toHaveCount(3);
    for (const [i, sku] of skus.entries()) {
      await page.getByLabel(`SL đặt — ${sku}`).fill(String(10 + i));
      await page.getByLabel(`SL đã về — ${sku}`).fill(String(i));
    }
    await page.getByRole("button", { name: /Lưu thay đổi \(3\)/ }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu 3 dòng");

    // Admin tải lại thấy số mới (ghi đè).
    await page.reload();
    await expect(page.getByLabel(`SL đặt — ${skus[2]}`)).toHaveValue("12");

    // Trang xem lọc theo CH X: số mới của X.
    await page.goto(`/?store=${x.code}&q=QT${t}&view=list`);
    const row = page.getByTestId("product-table").locator("tr", { hasText: skus[1] });
    await expect(row).toContainText("11");
    // Tổng toàn hệ thống của SP đầu = 10 + 5 đặt, 0 + 5 về → xem ở chi tiết.
    await page.goto(`/?q=QT${t}&view=list`);
    const total = page.getByTestId("product-table").locator("tr", { hasText: skus[0] });
    await expect(total).toContainText("15");
  });

  test("số không hợp lệ → khóa nút Lưu; SP không tồn tại → báo lỗi", async ({ page }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn Q${t}` } });
    brandId = brand.id;
    const line = await prisma.productLine.create({ data: { brandId, name: "Nhẫn" } });
    const s = await prisma.store.create({ data: { code: `QS${t}`, name: `CH ${t}` } });
    storeIds = [s.id];
    await prisma.product.create({ data: { sku: `QT${t}9`, brandId, productLineId: line.id } });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/quantities?mode=sp&sp=QT${t}9`);
    const input = page.getByLabel(`SL đặt — ${s.code}`);
    await input.fill("-3");
    await expect(page.getByRole("button", { name: /Lưu thay đổi/ })).toBeDisabled();
    await expect(page.getByText("Số lượng phải là số nguyên ≥ 0.")).toBeVisible();
    await page.goto(`/admin/quantities?mode=sp&sp=KHONGCO${t}`);
    await expect(page.getByRole("alert")).toContainText("Không có sản phẩm");
  });
});
