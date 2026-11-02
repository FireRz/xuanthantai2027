import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";

vi.mock("server-only", () => ({}));
const deleted = vi.hoisted(() => ({ calls: [] as string[][] }));
vi.mock("@/server/storage/blob", () => ({
  deleteFiles: async (u: string | string[]) => {
    deleted.calls.push(Array.isArray(u) ? u : [u]);
  },
}));

import { attachProductImage, productImagePath } from "@/server/services/product-image";
import { createProduct } from "@/server/services/product";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
  deleted.calls = [];
});
afterAll(() => prisma.$disconnect());

const url = (sku: string, kind: "image" | "thumb", v: string) =>
  `https://abc.public.blob.vercel-storage.com/${productImagePath(sku, kind).replace(".webp", `-${v}.webp`)}`;

async function product(sku = "NTT001") {
  const t = await makeBrandTree();
  return createProduct({ sku, brandId: t.brand.id, productLineId: t.line.id });
}

describe("T07.3 — gắn / thay ảnh sản phẩm", () => {
  it("gắn ảnh lần đầu: lưu URL, không xóa gì", async () => {
    const p = await product();
    await attachProductImage(p.id, url("NTT001", "image", "a1"), url("NTT001", "thumb", "a1"));
    const r = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(r.imageUrl).toBe(url("NTT001", "image", "a1"));
    expect(r.thumbUrl).toBe(url("NTT001", "thumb", "a1"));
    expect(deleted.calls.flat()).toEqual([]);
  });

  it("thay ảnh: URL mới, file cũ bị xóa khỏi Blob", async () => {
    const p = await product();
    await attachProductImage(p.id, url("NTT001", "image", "a1"), url("NTT001", "thumb", "a1"));
    await attachProductImage(p.id, url("NTT001", "image", "b2"), url("NTT001", "thumb", "b2"));
    const r = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(r.imageUrl).toBe(url("NTT001", "image", "b2"));
    expect(deleted.calls.flat().sort()).toEqual(
      [url("NTT001", "image", "a1"), url("NTT001", "thumb", "a1")].sort(),
    );
  });

  it("URL không thuộc SP / không phải Blob → từ chối, ảnh cũ giữ nguyên", async () => {
    const p = await product();
    await attachProductImage(p.id, url("NTT001", "image", "a1"), url("NTT001", "thumb", "a1"));
    deleted.calls = [];
    await expect(
      attachProductImage(p.id, url("KHAC", "image", "x"), url("KHAC", "thumb", "x")),
    ).rejects.toMatchObject({ code: "IMAGE_URL_INVALID" });
    await expect(
      attachProductImage(
        p.id,
        "https://evil.com/products/NTT001/image.webp",
        url("NTT001", "thumb", "z"),
      ),
    ).rejects.toMatchObject({ code: "IMAGE_URL_INVALID" });
    const r = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(r.imageUrl).toBe(url("NTT001", "image", "a1"));
    // Không xóa file của SP khác hoặc host lạ.
    expect(deleted.calls.flat()).not.toContain(url("KHAC", "image", "x"));
    expect(deleted.calls.flat()).not.toContain("https://evil.com/products/NTT001/image.webp");
  });

  it("SP không tồn tại → lỗi và dọn file vừa tải", async () => {
    await expect(
      attachProductImage("00000000-0000-4000-8000-000000000009", "u1", "u2"),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });
});
