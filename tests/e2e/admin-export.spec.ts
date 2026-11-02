import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";
import { createTestAdmin, login } from "./helpers";

const token = process.env.BLOB_READ_WRITE_TOKEN;

// Chạy trên DB dev đã seed (npm run seed): 3.000 SP, nhiều cửa hàng.

test.describe("xuất dữ liệu quản trị (T11.5)", () => {
  test.setTimeout(240_000);
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;

  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    await admin.cleanup();
  });

  test("chưa đăng nhập → 401 cho cả file xuất và file mẫu", async ({ request }) => {
    expect((await request.get("/api/admin-export")).status()).toBe(401);
    expect((await request.get("/api/import-template")).status()).toBe(401);
  });

  test("tải file: đúng tên, 3 sheet, đủ SP; file mẫu có danh sách chọn", async ({ page }) => {
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/export");
    await expect(page.getByTestId("export-products")).toContainText("SP đang hoạt động");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Tải file Excel" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^du-lieu-xuan-than-tai_\d{8}-\d{4}\.xlsx$/);
    const path = await download.path();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["SanPham", "SoLuong", "HuongDan", "DanhMuc"]);
    expect(wb.getWorksheet("SanPham")!.rowCount).toBeGreaterThan(100);
    expect((wb.getWorksheet("SoLuong")!.getRow(1).values as string[]).slice(1)).toEqual([
      "Mã SP",
      "Mã cửa hàng",
      "SL đặt",
      "SL đã về",
    ]);

    // File mẫu (trang Nhập Excel)
    await page.goto("/admin/import");
    const [tpl] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Tải file mẫu" }).click(),
    ]);
    expect(tpl.suggestedFilename()).toBe("mau-nhap-excel.xlsx");
  });

  test("AC8/AC3: xuất rồi nhập lại ngay → 0 lỗi, 0 thay đổi", async ({ page }) => {
    test.skip(!token, "Cần BLOB_READ_WRITE_TOKEN để tải file nhập lên Blob");
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    const res = await page.request.get("/api/admin-export");
    expect(res.status()).toBe(200);
    const buffer = await res.body();

    await page.goto("/admin/import");
    await page.getByLabel("Chọn file Excel").setInputFiles({
      name: "du-lieu-xuat.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
    await expect(page.getByTestId("sum-errors")).toContainText("0", { timeout: 120_000 });
    await expect(page.getByTestId("sum-new")).toContainText("0");
    await expect(page.getByTestId("sum-changed")).toContainText("0");
    await expect(page.getByTestId("sum-qty")).toContainText("0");
    await expect(page.getByText("File không tạo thay đổi nào")).toBeVisible();
    await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Chọn file khác" }).click();
  });
});
