import { prisma } from "@/server/db";

/** Xóa sạch dữ liệu giữa các test (giữ schema). */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE store_product_qty, product, product_line, collection, material, store, brand, admin_user CASCADE`,
  );
}

/** Tạo nhanh dữ liệu khung: 1 nhãn, 1 dòng, 1 BST, 1 chất liệu. */
export async function makeBrandTree(brandName = "Nhãn A") {
  const brand = await prisma.brand.create({ data: { name: brandName } });
  const line = await prisma.productLine.create({ data: { brandId: brand.id, name: "Dòng 1" } });
  const collection = await prisma.collection.create({ data: { brandId: brand.id, name: "BST 1" } });
  return { brand, line, collection };
}
