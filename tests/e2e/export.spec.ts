import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { prisma } from "../../src/server/db";

// Chạy trên DB dev đã seed (npm run seed): ≥ 100 SP, ≥ 2 cửa hàng.

test.afterAll(() => prisma.$disconnect());

async function readSheet(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("DanhSach")!;
  const text = (r: number) => String(ws.getRow(r).getCell(1).value ?? "");
  const header = (ws.getRow(5).values as unknown[]).slice(1).map(String);
  const rows: unknown[][] = [];
  ws.eachRow((row, n) => {
    if (n > 5) rows.push((row.values as unknown[]).slice(1));
  });
  return { ws, text, header, rows };
}

test.describe("T11.2 GET /api/export", () => {
  test("tổng hệ thống: tải được .xlsx, đúng cột, đủ mọi SP, ghi phạm vi + thời điểm", async ({
    request,
  }) => {
    const res = await request.get("/api/export");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("spreadsheetml.sheet");
    expect(res.headers()["content-disposition"]).toMatch(
      /attachment; filename="danh-sach-san-pham_tong-he-thong_\d{8}-\d{4}\.xlsx"/,
    );
    const { text, header, rows } = await readSheet(await res.body());
    expect(header).toEqual([
      "Mã SP",
      "Tên",
      "Nhãn",
      "Dòng",
      "BST",
      "Tuổi vàng",
      "Giá (₫)",
      "SL đặt",
      "SL đã về",
      "Còn thiếu",
      "Tỷ lệ về",
      "Link ảnh",
    ]);
    expect(text(2)).toBe("Phạm vi số liệu: Tổng hệ thống");
    expect(text(3)).toMatch(/^Thời điểm xuất: \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
    const skus = rows.map((r) => String(r[0]));
    expect(skus.length).toBeGreaterThan(24); // không phân trang
    expect([...skus].sort()).toEqual(skus); // Mã A→Z

    // Số liệu đúng với tổng hệ thống trong DB (view product_totals)
    const first = await prisma.$queryRaw<{ o: number; r: number }[]>`
      SELECT qty_ordered::int AS o, qty_received::int AS r FROM product_totals t
      JOIN product p ON p.id = t.product_id WHERE p.sku = ${skus[0]}`;
    const row = rows[0];
    expect(row[7]).toBe(first[0]?.o ?? 0);
    expect(row[8]).toBe(first[0]?.r ?? 0);
    expect(row[9]).toBe(Math.max((first[0]?.o ?? 0) - (first[0]?.r ?? 0), 0));
  });

  test("lọc cửa hàng + tìm mã + sắp xếp → file đúng phạm vi và số dòng như trang", async ({
    request,
    page,
  }) => {
    const store = await prisma.store.findFirstOrThrow({
      where: { active: true },
      orderBy: { code: "asc" },
    });
    const qs = `store=${store.code}&sort=price_desc`;
    const res = await request.get(`/api/export?${qs}`);
    const { text, rows } = await readSheet(await res.body());
    expect(text(2)).toContain(`(${store.code})`);
    expect(res.headers()["content-disposition"]).toContain(`_${store.code}_`);

    // Số dòng = số SP trang danh mục báo cho cùng tham số
    await page.goto(`/?${qs}`);
    const label = await page.getByTestId("scope-label").innerText();
    const total = Number(label.match(/([\d.]+) SP/)![1].replace(/\./g, ""));
    expect(rows.length).toBe(total);
    const prices = rows.map((r) => (typeof r[6] === "number" ? r[6] : -1));
    expect([...prices].sort((a, b) => b - a)).toEqual(prices); // giá cao → thấp

    const none = await readSheet(await (await request.get("/api/export?q=KHONG-CO-MA")).body());
    expect(none.rows.length).toBe(0);
  });
});

test.describe("T11.3 nút Xuất Excel trên danh mục", () => {
  test("lọc cửa hàng X → bấm nút → file chỉ chứa phạm vi X, cùng số SP với trang", async ({
    page,
    isMobile,
  }) => {
    const store = await prisma.store.findFirstOrThrow({
      where: { active: true },
      orderBy: { code: "asc" },
    });
    await page.goto(`/?store=${store.code}&sort=price_asc&n=48`);
    await expect(page.getByTestId("scope-label")).toContainText(store.code);
    const label = await page.getByTestId("scope-label").innerText();
    const total = Number(label.match(/([\d.]+) SP/)![1].replace(/\./g, ""));

    if (isMobile) {
      await expect(page.getByTestId("export-button")).toBeHidden();
      await page.getByTestId("export-menu").locator("summary").click();
    }
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId(isMobile ? "export-button-mobile" : "export-button").click(),
    ]);
    expect(download.suggestedFilename()).toContain(`_${store.code}_`);
    const path = await download.path();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.getWorksheet("DanhSach")!;
    expect(String(ws.getCell("A2").value)).toContain(`(${store.code})`);
    expect(ws.rowCount - 5).toBe(total); // đủ mọi SP, không chỉ 48 đang hiển thị
  });
});
