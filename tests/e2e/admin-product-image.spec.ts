import { randomBytes } from "node:crypto";
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
});
