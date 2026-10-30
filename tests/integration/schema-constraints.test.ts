import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

/** Lỗi vi phạm ràng buộc từ Postgres (Prisma bọc dưới nhiều dạng). */
async function expectDbError(promise: Promise<unknown>, pattern: RegExp) {
  await expect(promise).rejects.toSatisfy((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : "";
    return pattern.test(msg) || pattern.test(code);
  });
}

describe("T01.5 — ràng buộc unique", () => {
  it("từ chối SP trùng mã (kể cả khác hoa/thường)", async () => {
    const { brand, line } = await makeBrandTree();
    const base = { brandId: brand.id, productLineId: line.id };
    await prisma.product.create({ data: { ...base, sku: "NTT001" } });
    await expectDbError(
      prisma.product.create({ data: { ...base, sku: "NTT001" } }),
      /P2002|unique/i,
    );
    await expectDbError(
      prisma.product.create({ data: { ...base, sku: "ntt001" } }),
      /unique|23505/i,
    );
  });

  it("từ chối cửa hàng trùng mã", async () => {
    await prisma.store.create({ data: { code: "CH01", name: "Cửa hàng 1" } });
    await expectDbError(
      prisma.store.create({ data: { code: "CH01", name: "Khác" } }),
      /P2002|unique/i,
    );
  });

  it("từ chối nhãn trùng tên và chất liệu trùng tên", async () => {
    await prisma.brand.create({ data: { name: "PNJ" } });
    await expectDbError(prisma.brand.create({ data: { name: "PNJ" } }), /P2002|unique/i);
    await prisma.material.create({ data: { name: "Vàng 18K" } });
    await expectDbError(prisma.material.create({ data: { name: "Vàng 18K" } }), /P2002|unique/i);
  });

  it("tên dòng / BST duy nhất trong nhãn nhưng được trùng giữa các nhãn", async () => {
    const a = await prisma.brand.create({ data: { name: "A" } });
    const b = await prisma.brand.create({ data: { name: "B" } });
    await prisma.productLine.create({ data: { brandId: a.id, name: "Nhẫn" } });
    await expectDbError(
      prisma.productLine.create({ data: { brandId: a.id, name: "Nhẫn" } }),
      /P2002|unique/i,
    );
    await expect(
      prisma.productLine.create({ data: { brandId: b.id, name: "Nhẫn" } }),
    ).resolves.toBeTruthy();

    await prisma.collection.create({ data: { brandId: a.id, name: "Lộc" } });
    await expectDbError(
      prisma.collection.create({ data: { brandId: a.id, name: "Lộc" } }),
      /P2002|unique/i,
    );
    await expect(
      prisma.collection.create({ data: { brandId: b.id, name: "Lộc" } }),
    ).resolves.toBeTruthy();
  });

  it("mỗi cặp (SP, cửa hàng) chỉ có một dòng SL", async () => {
    const { brand, line } = await makeBrandTree();
    const p = await prisma.product.create({
      data: { sku: "X1", brandId: brand.id, productLineId: line.id },
    });
    const s = await prisma.store.create({ data: { code: "CH01", name: "CH 1" } });
    await prisma.storeProductQty.create({ data: { productId: p.id, storeId: s.id } });
    await expectDbError(
      prisma.storeProductQty.create({ data: { productId: p.id, storeId: s.id } }),
      /P2002|unique/i,
    );
  });
});

describe("T01.5 — CHECK ≥ 0", () => {
  it("từ chối giá âm, chấp nhận giá 0 và giá trống", async () => {
    const { brand, line } = await makeBrandTree();
    const base = { brandId: brand.id, productLineId: line.id };
    await expectDbError(
      prisma.product.create({ data: { ...base, sku: "A", priceVnd: -1 } }),
      /price_vnd_check|23514/i,
    );
    await expect(
      prisma.product.create({ data: { ...base, sku: "B", priceVnd: 0 } }),
    ).resolves.toBeTruthy();
    await expect(prisma.product.create({ data: { ...base, sku: "C" } })).resolves.toBeTruthy();
  });

  it("từ chối SL đặt hoặc SL về âm; về > đặt được phép", async () => {
    const { brand, line } = await makeBrandTree();
    const p = await prisma.product.create({
      data: { sku: "X1", brandId: brand.id, productLineId: line.id },
    });
    const s1 = await prisma.store.create({ data: { code: "CH01", name: "CH 1" } });
    const s2 = await prisma.store.create({ data: { code: "CH02", name: "CH 2" } });
    const s3 = await prisma.store.create({ data: { code: "CH03", name: "CH 3" } });
    await expectDbError(
      prisma.storeProductQty.create({ data: { productId: p.id, storeId: s1.id, qtyOrdered: -1 } }),
      /qty_ordered_check|23514/i,
    );
    await expectDbError(
      prisma.storeProductQty.create({ data: { productId: p.id, storeId: s2.id, qtyReceived: -5 } }),
      /qty_received_check|23514/i,
    );
    await expect(
      prisma.storeProductQty.create({
        data: { productId: p.id, storeId: s3.id, qtyOrdered: 5, qtyReceived: 7 },
      }),
    ).resolves.toBeTruthy();
  });
});
