import { prisma } from "@/server/db";

/** 2 nhãn; mỗi nhãn 2 dòng, 2 BST; 2 tuổi vàng; 3 cửa hàng; SP phủ mọi tổ hợp. */
export async function fixture() {
  const mats = [
    await prisma.material.create({ data: { name: "Vàng 18K" } }),
    await prisma.material.create({ data: { name: "Bạc" } }),
  ];
  const brands = [];
  for (const bn of ["Nhãn A", "Nhãn B"]) {
    const brand = await prisma.brand.create({ data: { name: bn } });
    const lines = await Promise.all(
      ["Nhẫn", "Dây"].map((n) =>
        prisma.productLine.create({ data: { brandId: brand.id, name: n } }),
      ),
    );
    const cols = await Promise.all(
      ["BST 1", "BST 2"].map((n) =>
        prisma.collection.create({ data: { brandId: brand.id, name: n } }),
      ),
    );
    brands.push({ brand, lines, cols });
  }
  const stores = await Promise.all(
    ["S1", "S2", "S3"].map((code) =>
      prisma.store.create({ data: { code, name: `Cửa hàng ${code}` } }),
    ),
  );

  type P = { sku: string; b: number; l: number; c: number | null; m: number | null };
  const products: P[] = [];
  let i = 0;
  for (let b = 0; b < 2; b++)
    for (let l = 0; l < 2; l++)
      for (const c of [0, 1, null])
        for (const m of [0, 1, null]) {
          i++;
          products.push({ sku: `P${String(i).padStart(3, "0")}`, b, l, c, m });
        }
  for (const p of products) {
    await prisma.product.create({
      data: {
        sku: p.sku,
        brandId: brands[p.b].brand.id,
        productLineId: brands[p.b].lines[p.l].id,
        collectionId: p.c === null ? null : brands[p.b].cols[p.c].id,
        materialId: p.m === null ? null : mats[p.m].id,
      },
    });
  }
  return { mats, brands, stores, products };
}

export type Fx = Awaited<ReturnType<typeof fixture>>;
