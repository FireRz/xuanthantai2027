import { randomBytes } from "node:crypto";
import JSZip from "jszip";
import { BlobNotFoundError, del, head } from "@vercel/blob";
import { expect, test } from "@playwright/test";
import { prisma } from "../../src/server/db";
import { createTestAdmin, login, makePng } from "./helpers";

const tag = () => randomBytes(3).toString("hex");
const token = process.env.BLOB_READ_WRITE_TOKEN;

// Tải ảnh thật lên store Blob dev → cần BLOB_READ_WRITE_TOKEN (như test T01.9).
test.skip(!token, "Cần BLOB_READ_WRITE_TOKEN để kiểm tra tải ảnh lên Blob");

test.describe("ảnh sản phẩm (F07)", () => {
  test.setTimeout(120_000);
  let admin: Awaited<ReturnType<typeof createTestAdmin>>;
  const brandIds: string[] = [];
  const urls: string[] = [];

  test.beforeEach(async () => {
    admin = await createTestAdmin();
  });
  test.afterEach(async () => {
    const ps = await prisma.product.findMany({
      where: { brandId: { in: brandIds } },
      select: { imageUrl: true, thumbUrl: true },
    });
    for (const p of ps) urls.push(...[p.imageUrl, p.thumbUrl].filter((u): u is string => !!u));
    if (urls.length) await del(urls, { token }).catch(() => {});
    urls.length = 0;
    await prisma.product.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.productLine.deleteMany({ where: { brandId: { in: brandIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    brandIds.length = 0;
    await admin.cleanup();
  });

  test("T07.6: đổi ảnh trong form → thẻ danh mục đổi theo, ảnh cũ bị xóa khỏi Blob", async ({
    page,
  }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
    const sku = `IMG${t}`;
    const product = await prisma.product.create({
      data: { sku, brandId: brand.id, productLineId: line.id, name: `Ảnh ${t}` },
    });

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/products/${product.id}`);

    const upload = async (rgb: [number, number, number]) => {
      await page.getByTestId("image-input").setInputFiles({
        name: `${sku}.png`,
        mimeType: "image/png",
        buffer: makePng(2400, 1800, rgb),
      });
      await expect(page.getByText("Đã cập nhật ảnh.")).toBeVisible({ timeout: 30_000 });
    };

    await upload([200, 30, 30]);
    const first = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(first.thumbUrl).toContain(`/products/${sku}/thumb`);
    expect(first.imageUrl).toContain(`/products/${sku}/image`);

    // Trang xem công khai dùng đúng thumbnail vừa tải
    await page.goto(`/?q=${sku}`);
    await expect(page.locator(`[data-sku="${sku}"] img`)).toHaveAttribute("src", first.thumbUrl!);

    // Thay ảnh: URL mới, ảnh cũ bị xóa
    await page.goto(`/admin/products/${product.id}`);
    await upload([30, 30, 200]);
    const second = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(second.thumbUrl).not.toBe(first.thumbUrl);
    await page.goto(`/?q=${sku}`);
    await expect(page.locator(`[data-sku="${sku}"] img`)).toHaveAttribute("src", second.thumbUrl!);
    await expect(head(first.imageUrl!, { token })).rejects.toBeInstanceOf(BlobNotFoundError);
    await expect(head(first.thumbUrl!, { token })).rejects.toBeInstanceOf(BlobNotFoundError);
  });

  test("AC6: file không phải ảnh bị từ chối có thông báo", async ({ page }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
    const product = await prisma.product.create({
      data: { sku: `TXT${t}`, brandId: brand.id, productLineId: line.id },
    });
    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto(`/admin/products/${product.id}`);
    await page.getByTestId("image-input").setInputFiles({
      name: "ghi-chu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });
    await expect(page.locator("section [role=alert]")).toContainText("JPG, PNG hoặc WEBP");
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(after.imageUrl).toBeNull();
  });
  test("T07.8: 10 ảnh, 2 tên sai → 8 gắn đúng, 2 báo không khớp; .zip giải nén trên trình duyệt", async ({
    page,
  }) => {
    const t = tag();
    const brand = await prisma.brand.create({ data: { name: `Nhãn ${t}` } });
    brandIds.push(brand.id);
    const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Nhẫn" } });
    const skus = Array.from({ length: 8 }, (_, i) => `BAT${t}${i}`);
    await prisma.product.createMany({
      data: skus.map((sku) => ({ sku, brandId: brand.id, productLineId: line.id })),
    });
    // SP thứ 9 chưa có ảnh trong lô này
    const spare = `BAT${t}X`;
    await prisma.product.create({
      data: { sku: spare, brandId: brand.id, productLineId: line.id },
    });

    const files = [
      ...skus.map((sku, i) => ({
        name: i % 2 ? `${sku.toLowerCase()}.png` : `${sku}.png`,
        mimeType: "image/png",
        buffer: makePng(900, 600, [40 + i * 20, 90, 60]),
      })),
      { name: `SAI${t}1.png`, mimeType: "image/png", buffer: makePng(300, 300, [1, 2, 3]) },
      { name: `SAI${t}2.png`, mimeType: "image/png", buffer: makePng(300, 300, [3, 2, 1]) },
    ];

    await login(page, admin.username, admin.password);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/images");
    await page.getByTestId("batch-files").setInputFiles(files);

    // Xem trước: chưa gắn gì cả
    await expect(page.getByTestId("stat-matched")).toHaveText("8");
    await expect(page.getByTestId("stat-unmatched")).toHaveText("2");
    await expect(page.getByTestId("list-unmatched")).toContainText(`SAI${t}1.png`);
    expect(
      await prisma.product.count({ where: { sku: { in: skus }, imageUrl: { not: null } } }),
    ).toBe(0);

    await page.getByRole("button", { name: "Tải lên 8 ảnh" }).click();
    await expect(page.getByText("Xong: 8/8 ảnh đã gắn.")).toBeVisible({ timeout: 90_000 });
    const rows = await prisma.product.findMany({ where: { sku: { in: skus } } });
    expect(rows.every((r) => r.imageUrl && r.thumbUrl)).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { sku: spare } })).imageUrl).toBeNull();
    const before = new Map(rows.map((r) => [r.sku, r.thumbUrl]));

    // Lô thứ hai là .zip: tải lại cùng mã = thay ảnh cũ
    const zip = new JSZip();
    zip.file(`anh/${skus[0]}.png`, makePng(500, 500, [250, 10, 10]));
    zip.file(`${spare}.png`, makePng(500, 500, [10, 250, 10]));
    zip.file("ghi-chu.txt", "không phải ảnh");
    const zipBuf = Buffer.from(await zip.generateAsync({ type: "uint8array" }));
    await page.getByRole("button", { name: "Tải thêm ảnh" }).click();
    await page.getByTestId("batch-files").setInputFiles({
      name: "anh-moi.zip",
      mimeType: "application/zip",
      buffer: zipBuf,
    });
    await expect(page.getByTestId("stat-matched")).toHaveText("2");
    await expect(page.getByTestId("stat-invalid")).toHaveText("1");
    await expect(page.getByTestId("list-matched")).toContainText("thay ảnh cũ");
    await page.getByRole("button", { name: "Tải lên 2 ảnh" }).click();
    await expect(page.getByText("Xong: 2/2 ảnh đã gắn.")).toBeVisible({ timeout: 60_000 });

    const replaced = await prisma.product.findUniqueOrThrow({ where: { sku: skus[0] } });
    expect(replaced.thumbUrl).not.toBe(before.get(skus[0]));
    await expect(head(before.get(skus[0])!, { token })).rejects.toBeInstanceOf(BlobNotFoundError);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { sku: spare } })).thumbUrl,
    ).toBeTruthy();
  });
});
