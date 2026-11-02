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
});
