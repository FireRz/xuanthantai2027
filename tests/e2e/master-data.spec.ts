import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { createTestAdmin, login } from "./helpers";

// Mỗi test dùng tên ngẫu nhiên: hai viewport chạy song song trên cùng một DB.
const tag = () => randomBytes(3).toString("hex");

test.describe("quản trị danh mục (T06.5)", () => {
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

  test("thêm BST dưới nhãn A → trang xem hiện BST đó; ẩn BST có xác nhận → biến mất", async ({
    page,
    isMobile,
  }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn A ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/master-data");

    const card = page.getByTestId("brand-card").filter({ hasText: brand.name });
    const colName = `BST ${t}`;
    await card.getByLabel(`Tên — Thêm BST — ${brand.name}`).fill(colName);
    await card.getByRole("button", { name: `Thêm BST — ${brand.name}` }).click();
    await expect(card.getByText(colName)).toBeVisible();

    // BST mới thuộc đúng nhãn A
    const collection = await prisma.collection.findFirstOrThrow({ where: { name: colName } });
    expect(collection.brandId).toBe(brand.id);

    // Có SP trong BST → trang xem hiện thẻ BST (bộ lọc trang xem do F04 làm sau)
    await prisma.product.create({
      data: {
        sku: `E2E${t}`,
        brandId: brand.id,
        productLineId: line.id,
        collectionId: collection.id,
      },
    });
    await page.goto("/");
    await expect(page.getByText(colName).first()).toBeVisible();

    // Bộ lọc trang xem: chọn nhãn A → danh sách BST có (hoặc không còn) BST vừa thêm
    const collectionInFilter = async () => {
      await page.goto("/");
      if (isMobile) {
        await page.getByTestId("open-filter-sheet").click();
        const sheet = page.getByTestId("filter-sheet");
        await sheet.getByRole("button", { name: new RegExp(`^${brand.name}`) }).click();
        return sheet.getByText(colName);
      }
      await page.getByRole("button", { name: /^Nhãn hàng/ }).click();
      await page
        .getByRole("group", { name: "Nhãn hàng" })
        .getByRole("checkbox", { name: new RegExp(`^${brand.name}`) })
        .click();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^Bộ sưu tập/ }).click();
      return page.getByRole("group", { name: "Bộ sưu tập" }).getByText(colName);
    };
    await expect(await collectionInFilter()).toHaveCount(1);

    // Ẩn BST: hộp xác nhận báo 1 SP bị ảnh hưởng
    await page.goto("/admin/master-data");
    const row = page
      .getByTestId("brand-card")
      .filter({ hasText: brand.name })
      .getByTestId("row-collection")
      .filter({ hasText: colName });
    await row.getByRole("button", { name: "Ẩn" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("impact-count")).toHaveText("1");
    await dialog.getByRole("button", { name: "Ẩn", exact: true }).click();
    await expect(row.getByText("Đã ẩn", { exact: true })).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(colName)).toHaveCount(0);
    await expect(await collectionInFilter()).toHaveCount(0);

    // Hiện lại → thẻ quay lại
    await page.goto("/admin/master-data");
    await row.getByRole("button", { name: "Hiện" }).click();
    await expect(row.getByText("Đã ẩn", { exact: true })).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText(colName).first()).toBeVisible();
  });

  test("tạo dòng trùng tên trong nhãn → báo lỗi; xóa mục đang được dùng → báo phải ẩn", async ({
    page,
  }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn B ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
    await prisma.product.create({
      data: { sku: `E2E${t}`, brandId: brand.id, productLineId: line.id },
    });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/master-data");
    const card = page.getByTestId("brand-card").filter({ hasText: brand.name });

    await card.getByLabel(`Tên — Thêm dòng — ${brand.name}`).fill("nhẫn");
    await card.getByRole("button", { name: `Thêm dòng — ${brand.name}` }).click();
    await expect(card.getByRole("alert")).toContainText("đã tồn tại");

    const row = card.getByTestId("row-line").filter({ hasText: "Nhẫn" });
    await row.getByRole("button", { name: "Xóa" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa", exact: true }).click();
    await expect(row.getByRole("alert")).toContainText("Hãy ẩn thay vì xóa");
  });

  test("thêm, sửa, ẩn cửa hàng; mã cửa hàng trùng bị chặn", async ({ page }) => {
    const t = tag();
    const code = `E${t}`.toUpperCase();
    try {
      await login(page, admin.username, admin.password);
      await expect(page).toHaveURL(/\/admin$/);

      await page.goto("/admin/master-data?tab=stores");
      await page.getByLabel("Mã cửa hàng").first().fill(code);
      await page.getByLabel("Tên cửa hàng mới").fill(`Cửa hàng ${t}`);
      await page.getByRole("button", { name: "Thêm cửa hàng" }).click();
      const row = page.getByTestId("row-store").filter({ hasText: code });
      await expect(row).toBeVisible();

      // trùng mã
      await page.getByLabel("Mã cửa hàng").first().fill(code.toLowerCase());
      await page.getByLabel("Tên cửa hàng mới").fill("Khác");
      await page.getByRole("button", { name: "Thêm cửa hàng" }).click();
      await expect(page.locator("p[role=alert]")).toContainText("đã tồn tại");

      // sửa tên
      await row.getByRole("button", { name: "Sửa" }).click();
      // ở chế độ sửa, mã nằm trong ô nhập nên không còn khớp bộ lọc theo chữ của dòng
      await page.getByLabel("Tên cửa hàng", { exact: true }).fill(`Tên mới ${t}`);
      await page.getByRole("button", { name: "Lưu" }).click();
      await expect(row.getByText(`Tên mới ${t}`)).toBeVisible();

      // ẩn
      await row.getByRole("button", { name: "Ẩn" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Ẩn", exact: true }).click();
      await expect(row.getByText("Đã ẩn", { exact: true })).toBeVisible();
    } finally {
      await prisma.store.deleteMany({ where: { code: { equals: code, mode: "insensitive" } } });
    }
  });

  test("có hướng dẫn thứ tự nhập, trỏ tới đúng tab", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/master-data");
    const guide = page.getByTestId("setup-guide");
    await expect(guide.getByText("Hướng dẫn thứ tự nhập")).toBeVisible();
    await guide.getByText("Hướng dẫn thứ tự nhập").click(); // mở nếu đang thu gọn
    await guide.getByRole("link", { name: "Tạo cửa hàng" }).click();
    await expect(page).toHaveURL(/tab=stores/);
  });

  test("chưa đăng nhập vào /admin/master-data → /login", async ({ page }) => {
    await page.goto("/admin/master-data");
    await expect(page).toHaveURL(/\/login/);
  });
});
