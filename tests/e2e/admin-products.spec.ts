import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { createTestAdmin, login } from "./helpers";

const tag = () => randomBytes(3).toString("hex");

test.describe("quản trị sản phẩm (F07)", () => {
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  const brandIds: string[] = [];

  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    await prisma.product.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.collection.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.productLine.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    brandIds.length = 0;
    await admin.cleanup();
  });

  async function seed(t: string) {
    const brand = await prisma.brand.create({ data: { name: `Nhãn ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
    return { brand, line };
  }

  test("T07.4: tìm mã → đúng SP; SP ẩn vẫn thấy trong admin", async ({ page }) => {
    const t = tag();
    const { brand, line } = await seed(t);
    const mk = (sku: string, active = true) =>
      prisma.product.create({
        data: { sku, brandId: brand.id, productLineId: line.id, name: `Tên ${sku}`, active },
      });
    await mk(`AA${t}1`);
    await mk(`AA${t}2`, false);
    await mk(`ZZ${t}9`);

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/products");
    await page.getByLabel("Tìm theo mã").fill(`AA${t}`);
    await page.getByRole("button", { name: "Lọc" }).click();
    const rows = page.getByTestId("product-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: `AA${t}1` })).toContainText("Đang hiện");
    await expect(rows.filter({ hasText: `AA${t}2` })).toContainText("Đã ẩn");
    await expect(page.getByText(`ZZ${t}9`)).toHaveCount(0);
  });
  test("T07.5: thêm SP (dòng lọc theo nhãn) → hiện ở trang xem; mã chỉ đọc khi sửa", async ({
    page,
  }) => {
    const t = tag();
    const { brand, line } = await seed(t);
    const other = await prisma.brand.create({ data: { name: `Nhãn khác ${t}` } });
    brandIds.push(other.id);
    await prisma.productLine.create({ data: { brandId: other.id, name: `Dòng khác ${t}` } });
    await prisma.collection.create({ data: { brandId: brand.id, name: `BST ${t}` } });
    const sku = `NEW${t}`;

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/products/new");

    // Chưa chọn nhãn → chưa chọn được dòng; chọn nhãn → chỉ thấy dòng của nhãn đó
    await expect(page.getByLabel("Dòng hàng *")).toBeDisabled();
    await page.getByLabel("Mã sản phẩm *").fill(sku);
    await page.getByLabel("Nhãn hàng *").selectOption({ label: brand.name });
    await expect(page.getByLabel("Dòng hàng *").locator("option", { hasText: "Nhẫn" })).toHaveCount(
      1,
    );
    await expect(
      page.getByLabel("Dòng hàng *").locator("option", { hasText: `Dòng khác ${t}` }),
    ).toHaveCount(0);

    // Thiếu dòng → báo lỗi
    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("dòng hàng");

    await page.getByLabel("Dòng hàng *").selectOption({ label: line.name });
    await page.getByLabel("Tên sản phẩm").fill(`Nhẫn thử ${t}`);
    await page.getByLabel("Bộ sưu tập").selectOption({ label: `BST ${t}` });
    await page.getByLabel("Giá bán lẻ (VND)").fill("1500000");
    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();

    // Sang trang sửa: mã chỉ đọc
    await expect(page.getByText("Đã thêm sản phẩm.")).toBeVisible();
    await expect(page.getByLabel("Mã sản phẩm *")).toHaveJSProperty("readOnly", true);
    await page.getByLabel("Tên sản phẩm").fill(`Nhẫn đổi ${t}`);
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByText("Đã lưu thay đổi.")).toBeVisible();

    // Trùng mã → lỗi
    await page.goto("/admin/products/new");
    await page.getByLabel("Mã sản phẩm *").fill(sku.toLowerCase());
    await page.getByLabel("Nhãn hàng *").selectOption({ label: brand.name });
    await page.getByLabel("Dòng hàng *").selectOption({ label: line.name });
    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("đã tồn tại");

    // Trang xem công khai thấy SP
    await page.goto(`/?q=${sku}`);
    await expect(page.getByText(sku).first()).toBeVisible();
  });
});
