import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { SAMPLE, seed } from "../../prisma/seed-data";
import { resetDb } from "./helpers";

beforeAll(resetDb);
afterAll(() => prisma.$disconnect());

describe("T01.8 — seed dữ liệu mẫu", () => {
  it("tạo đúng số lượng và chạy lại không lỗi, không nhân đôi", async () => {
    await seed(prisma, SAMPLE);
    await seed(prisma, SAMPLE);

    expect(await prisma.brand.count()).toBe(3);
    expect(await prisma.productLine.count()).toBe(9);
    expect(await prisma.collection.count()).toBe(6);
    expect(await prisma.material.count()).toBe(5);
    expect(await prisma.store.count()).toBe(10);
    expect(await prisma.product.count()).toBe(200);
  });

  it("có các trường hợp đặc biệt: SP không BST, không giá, về > đặt", async () => {
    expect(await prisma.product.count({ where: { collectionId: null } })).toBeGreaterThan(0);
    expect(await prisma.product.count({ where: { priceVnd: null } })).toBeGreaterThan(0);
    const over = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM store_product_qty WHERE qty_received > qty_ordered`;
    expect(over[0].n).toBeGreaterThan(0);
  });

  it("dòng và BST của mọi SP cùng nhãn với SP", async () => {
    const bad = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM product p
      JOIN product_line l ON l.id = p.product_line_id
      LEFT JOIN collection c ON c.id = p.collection_id
      WHERE l.brand_id <> p.brand_id OR (c.id IS NOT NULL AND c.brand_id <> p.brand_id)`;
    expect(bad[0].n).toBe(0);
  });
});
