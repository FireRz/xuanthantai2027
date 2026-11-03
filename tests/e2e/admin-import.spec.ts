import { randomBytes } from "node:crypto";
import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { createTestAdmin, login } from "./helpers";

const tag = () => randomBytes(3).toString("hex").toUpperCase();
const token = process.env.BLOB_READ_WRITE_TOKEN;

// File được trình duyệt tải thẳng lên Blob → cần BLOB_READ_WRITE_TOKEN.
test.skip(!token, "Cần BLOB_READ_WRITE_TOKEN để kiểm tra tải file nhập lên Blob");

type Cell = string | number | null;

async function xlsx(products: Cell[][], quantities: Cell[][]) {
  const wb = new ExcelJS.Workbook();
  const sp = wb.addWorksheet("SanPham");
  sp.addRow(["Mã SP", "Tên SP", "Nhãn hàng", "Dòng hàng", "Bộ sưu tập", "Giá bán lẻ"]);
  products.forEach((r) => sp.addRow(r));
  const sl = wb.addWorksheet("SoLuong");
  sl.addRow(["Mã SP", "Mã cửa hàng", "SL đặt", "SL đã về"]);
  quantities.forEach((r) => sl.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test.describe("nhập Excel — xem trước và áp dụng (T08.8)", () => {
  test.setTimeout(120_000);
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  let brandId = "";
  let storeIds: string[] = [];

  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    if (brandId) await cleanup();
    brandId = "";
    storeIds = [];
    await admin.cleanup();
  });
  async function cleanup() {
    await prisma.storeProductQty.deleteMany({ where: { storeId: { in: storeIds } } });
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.collection.deleteMany({ where: { brandId } });
    await prisma.productLine.deleteMany({ where: { brandId } });
    await prisma.brand.deleteMany({ where: { id: brandId } });
    await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
  }

  async function seed(t: string) {
    const brand = await prisma.brand.create({ data: { name: `Nhãn I${t}` } });
    brandId = brand.id;
    await prisma.productLine.create({ data: { brandId, name: "Nhẫn" } });
    await prisma.collection.create({ data: { brandId, name: "Xuân 2027" } });
    const s = await prisma.store.create({ data: { code: `IM${t}`, name: `Cửa hàng ${t}` } });
    storeIds = [s.id];
    return { brand, store: s };
  }

  test("file 2 dòng lỗi → đúng dòng & lý do, nút Áp dụng khóa, không ghi gì", async ({ page }) => {
    const t = tag();
    const { brand, store } = await seed(t);
    const buffer = await xlsx(
      [
        [`IM${t}1`, "SP một", brand.name, "Nhẫn", "Xuân 2027", 100000],
        [`IM${t}2`, "SP hai", brand.name, "Nhẫn", "Xuân 2027", "abc"], // dòng 3: giá sai
      ],
      [
        [`IM${t}1`, store.code, 5, 1],
        [`IM${t}1`, "CH99X", 2, 0], // dòng 3: cửa hàng chưa có
      ],
    );

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/import");
    await page.getByLabel("Chọn file Excel").setInputFiles({
      name: "so-lieu.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });

    await expect(page.getByTestId("import-blocked")).toContainText("Còn 2 lỗi");
    await expect(page.getByTestId("sum-errors")).toContainText("2");
    await expect(page.getByTestId("sum-new")).toContainText("1");
    const errors = page.getByTestId("import-error-row");
    await expect(errors).toHaveCount(2);
    await expect(errors.nth(0)).toContainText("SanPham");
    await expect(errors.nth(0)).toContainText("3");
    await expect(errors.nth(0)).toContainText("Giá bán lẻ");
    await expect(errors.nth(0)).toContainText("Giá bán lẻ phải là số nguyên VND ≥ 0");
    await expect(errors.nth(1)).toContainText("SoLuong");
    await expect(errors.nth(1)).toContainText("Mã cửa hàng");
    await expect(errors.nth(1)).toContainText('Mã cửa hàng "CH99X" chưa có trên web');
    await expect(page.getByRole("button", { name: /Áp dụng/ })).toBeDisabled();

    expect(await prisma.product.count({ where: { brandId } })).toBe(0);
    await page.getByRole("button", { name: "Chọn file khác" }).click();
    await expect(page.getByLabel("Chọn file Excel")).toBeVisible();
  });

  test("file hợp lệ → thẻ tổng hợp, cũ → mới, Áp dụng ghi vào hệ thống", async ({ page }) => {
    const t = tag();
    const { brand, store } = await seed(t);
    const line = await prisma.productLine.findFirstOrThrow({ where: { brandId } });
    const existing = await prisma.product.create({
      data: { sku: `IM${t}A`, brandId, productLineId: line.id, priceVnd: 1_000 },
    });
    await prisma.storeProductQty.create({
      data: { productId: existing.id, storeId: store.id, qtyOrdered: 10, qtyReceived: 2 },
    });
    const buffer = await xlsx(
      [
        [`IM${t}A`, null, null, null, null, 2000],
        [`IM${t}B`, "SP mới", brand.name, "Nhẫn", null, null],
      ],
      [
        [`IM${t}A`, store.code, 15, null],
        [`IM${t}B`, store.code, 3, 3],
      ],
    );

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/import");
    await page.getByLabel("Chọn file Excel").setInputFiles({
      name: "hop-le.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });

    await expect(page.getByTestId("sum-new")).toContainText("1");
    await expect(page.getByTestId("sum-changed")).toContainText("1");
    await expect(page.getByTestId("sum-qty")).toContainText("2");
    await expect(page.getByTestId("sum-errors")).toContainText("0");
    await page.getByRole("tab", { name: "Thay đổi" }).click();
    const price = page.getByTestId("import-row").filter({ hasText: "Giá bán lẻ" });
    await expect(price).toContainText("1.000");
    await expect(price).toContainText("2.000");
    const ordered = page.getByTestId("import-row").filter({ hasText: "SL đặt" }).first();
    await expect(ordered).toContainText("10");
    await expect(ordered).toContainText("15");

    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "Đã áp dụng: 1 SP mới, 1 SP thay đổi, 2 dòng số lượng",
    );

    const q = await prisma.storeProductQty.findFirstOrThrow({
      where: { productId: existing.id, storeId: store.id },
    });
    expect([q.qtyOrdered, q.qtyReceived]).toEqual([15, 2]);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: existing.id } })).priceVnd).toBe(
      2000,
    );
    expect(await prisma.product.count({ where: { sku: `IM${t}B` } })).toBe(1);
  });

  test("file không phải .xlsx hợp lệ → thông báo lỗi dễ hiểu", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/import");
    await page.getByLabel("Chọn file Excel").setInputFiles({
      name: "hong.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("đây không phải file excel"),
    });
    await expect(page.getByText("Không đọc được file")).toBeVisible();
  });
});
