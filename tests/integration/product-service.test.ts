import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createProduct,
  setProductActive,
  setProductsActive,
  updateProduct,
} from "@/server/services/product";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const a = await makeBrandTree("Nhãn A");
  const b = await makeBrandTree("Nhãn B");
  return { a, b };
}

const base = (t: Awaited<ReturnType<typeof setup>>["a"], sku = "NTT001") => ({
  sku,
  brandId: t.brand.id,
  productLineId: t.line.id,
});

describe("T07.2 — service sản phẩm", () => {
  it("tạo SP đủ trường bắt buộc; trường tùy chọn để trống", async () => {
    const { a } = await setup();
    const p = await createProduct({ ...base(a), collectionId: a.collection.id, priceVnd: "1000" });
    expect(p).toMatchObject({ sku: "NTT001", active: true, priceVnd: 1000, name: null });
    expect(p.collectionId).toBe(a.collection.id);
  });

  it("thiếu Dòng → lỗi; trùng mã (kể cả khác hoa/thường) → lỗi", async () => {
    const { a } = await setup();
    await expect(createProduct({ sku: "X1", brandId: a.brand.id })).rejects.toMatchObject({
      code: "PRODUCT_INVALID",
    });
    await createProduct(base(a, "NTT001"));
    await expect(createProduct(base(a, "ntt001"))).rejects.toMatchObject({ code: "SKU_DUPLICATE" });
    expect(await prisma.product.count()).toBe(1);
  });

  it("dòng / BST khác nhãn → lỗi, không ghi", async () => {
    const { a, b } = await setup();
    await expect(createProduct({ ...base(a), productLineId: b.line.id })).rejects.toMatchObject({
      code: "LINE_BRAND_MISMATCH",
    });
    await expect(
      createProduct({ ...base(a), collectionId: b.collection.id }),
    ).rejects.toMatchObject({ code: "COLLECTION_BRAND_MISMATCH" });
    expect(await prisma.product.count()).toBe(0);
  });

  it("update: đổi thông tin được, gửi mã mới bị bỏ qua, dòng khác nhãn bị chặn", async () => {
    const { a, b } = await setup();
    const p = await createProduct(base(a));
    const u = await updateProduct(p.id, {
      ...base(a, "DOI-MA"),
      name: "  Nhẫn  vàng ",
      priceVnd: 5,
      collectionId: "",
    });
    expect(u.sku).toBe("NTT001");
    expect(u.name).toBe("Nhẫn vàng");
    expect(u.priceVnd).toBe(5);
    await expect(updateProduct(p.id, { ...base(a), brandId: b.brand.id })).rejects.toMatchObject({
      code: "LINE_BRAND_MISMATCH",
    });
    await expect(
      updateProduct("00000000-0000-4000-8000-000000000009", base(a)),
    ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
  });

  it("update không đụng tới ảnh và trạng thái ẩn", async () => {
    const { a } = await setup();
    const p = await createProduct(base(a));
    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: "https://x/i.webp", thumbUrl: "https://x/t.webp", active: false },
    });
    const u = await updateProduct(p.id, { ...base(a), name: "Mới" });
    expect(u).toMatchObject({
      imageUrl: "https://x/i.webp",
      thumbUrl: "https://x/t.webp",
      active: false,
    });
  });

  it("ẩn / hiện đơn lẻ và nhiều SP; không xóa", async () => {
    const { a } = await setup();
    const p1 = await createProduct(base(a, "A1"));
    const p2 = await createProduct(base(a, "A2"));
    await setProductActive(p1.id, false);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p1.id } })).active).toBe(false);
    expect(await setProductsActive([p1.id, p2.id], false)).toBe(2);
    expect(await setProductsActive([p1.id, p2.id], true)).toBe(2);
    expect(await prisma.product.count({ where: { active: true } })).toBe(2);
    await expect(
      setProductActive("00000000-0000-4000-8000-000000000009", true),
    ).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
    });
  });
});
