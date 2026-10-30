import type { Brand, Collection, Material, PrismaClient, ProductLine } from "@prisma/client";

/**
 * Sinh dữ liệu mẫu (T01.8) và dữ liệu quy mô lớn (T01.11).
 * Chạy lại nhiều lần không lỗi: danh mục upsert theo khóa duy nhất, SP và SL
 * dùng createMany skipDuplicates (không ghi đè dữ liệu đã có).
 * Dữ liệu tất định (PRNG có seed) để số liệu giống nhau giữa các máy.
 */

export interface SeedOptions {
  products: number;
  stores: number;
  /** true: mọi cặp (SP, CH) đều có dòng SL; false: mỗi SP chỉ đặt ở một phần cửa hàng. */
  fullMatrix: boolean;
  log?: (msg: string) => void;
}

export const SAMPLE: SeedOptions = { products: 200, stores: 10, fullMatrix: false };
export const LARGE: SeedOptions = { products: 3000, stores: 100, fullMatrix: true };

const BRANDS = [
  { name: "Thần Tài Gold", prefix: "TTG" },
  { name: "Phúc Lộc", prefix: "PL" },
  { name: "An Khang", prefix: "AK" },
];
const LINES = ["Nhẫn", "Dây chuyền", "Bông tai"];
const COLLECTIONS = ["Lộc Xuân", "Kim Mã Đón Tết"];
const MATERIALS = ["Vàng 24K", "Vàng 18K", "Vàng 14K", "Vàng trắng 18K", "Bạc 925"];
const BATCH = 5000;

/** mulberry32 — PRNG nhỏ, tất định. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seed(prisma: PrismaClient, opts: SeedOptions) {
  const log = opts.log ?? (() => {});
  const rand = rng(2027);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  // Danh mục
  const brands: Array<
    (typeof BRANDS)[number] & { brand: Brand; lines: ProductLine[]; collections: Collection[] }
  > = [];
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { name: b.name },
      create: { name: b.name },
      update: {},
    });
    const lines = [];
    for (const name of LINES) {
      lines.push(
        await prisma.productLine.upsert({
          where: { brandId_name: { brandId: brand.id, name } },
          create: { brandId: brand.id, name },
          update: {},
        }),
      );
    }
    const collections = [];
    for (const name of COLLECTIONS) {
      collections.push(
        await prisma.collection.upsert({
          where: { brandId_name: { brandId: brand.id, name } },
          create: { brandId: brand.id, name },
          update: {},
        }),
      );
    }
    brands.push({ ...b, brand, lines, collections });
  }
  const materials: Material[] = [];
  for (const name of MATERIALS) {
    materials.push(await prisma.material.upsert({ where: { name }, create: { name }, update: {} }));
  }
  log(`Danh mục: ${brands.length} nhãn, ${materials.length} chất liệu`);

  // Cửa hàng
  const storeData = Array.from({ length: opts.stores }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    return { code: `CH${n}`, name: `Cửa hàng ${n}` };
  });
  await prisma.store.createMany({ data: storeData, skipDuplicates: true });
  const stores = await prisma.store.findMany({
    where: { code: { in: storeData.map((s) => s.code) } },
    orderBy: { code: "asc" },
  });
  log(`Cửa hàng: ${stores.length}`);

  // Sản phẩm: rải đều cho 3 nhãn; ~25% không BST, ~10% không giá, ~10% không chất liệu.
  const productData = Array.from({ length: opts.products }, (_, i) => {
    const b = brands[i % brands.length];
    const line = b.lines[int(0, b.lines.length - 1)];
    const noCollection = i % 4 === 3;
    const collection = noCollection ? null : b.collections[int(0, b.collections.length - 1)];
    const material = i % 10 === 7 ? null : materials[int(0, materials.length - 1)];
    const sku = `${b.prefix}${String(Math.floor(i / brands.length) + 1).padStart(4, "0")}`;
    return {
      sku,
      name: `${line.name} ${collection?.name ?? b.name} ${sku}`,
      brandId: b.brand.id,
      productLineId: line.id,
      collectionId: collection?.id ?? null,
      materialId: material?.id ?? null,
      priceVnd: i % 10 === 5 ? null : int(15, 900) * 100_000,
    };
  });
  for (let i = 0; i < productData.length; i += BATCH) {
    await prisma.product.createMany({
      data: productData.slice(i, i + BATCH),
      skipDuplicates: true,
    });
  }
  const products = await prisma.product.findMany({
    where: { sku: { in: productData.map((p) => p.sku) } },
    select: { id: true },
    orderBy: { sku: "asc" },
  });
  log(`Sản phẩm: ${products.length}`);

  // Số lượng: có SP về > đặt, SP chưa về, SP đủ hàng, SP thiếu một phần, cặp đặt 0.
  const qtyData: { productId: string; storeId: string; qtyOrdered: number; qtyReceived: number }[] =
    [];
  for (const p of products) {
    for (const s of stores) {
      if (!opts.fullMatrix && rand() < 0.4) continue;
      const ordered = rand() < 0.1 ? 0 : int(1, 20);
      const roll = rand();
      const received =
        roll < 0.08
          ? ordered + int(1, 3) // về > đặt (BR-16)
          : roll < 0.3
            ? 0
            : roll < 0.65
              ? ordered
              : int(0, ordered);
      qtyData.push({ productId: p.id, storeId: s.id, qtyOrdered: ordered, qtyReceived: received });
    }
  }
  for (let i = 0; i < qtyData.length; i += BATCH) {
    await prisma.storeProductQty.createMany({
      data: qtyData.slice(i, i + BATCH),
      skipDuplicates: true,
    });
  }
  log(`Dòng số lượng: ${qtyData.length}`);
}
