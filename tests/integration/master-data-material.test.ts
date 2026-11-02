import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createMaterial, renameMaterial } from "@/server/services/master-data";
import { createProduct } from "@/server/repositories/product";
import { makeBrandTree, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("T06.2 — Chất liệu", () => {
  it("tạo chất liệu (không thuộc nhãn)", async () => {
    const m = await createMaterial(" Vàng  18K ");
    expect(m).toMatchObject({ name: "Vàng 18K", active: true });
  });

  it("tên rỗng → lỗi", async () => {
    await expect(createMaterial("")).rejects.toMatchObject({ code: "NAME_INVALID" });
  });

  it("trùng tên → lỗi", async () => {
    await createMaterial("Vàng 18K");
    await expect(createMaterial("vàng 18k")).rejects.toMatchObject({ code: "NAME_DUPLICATE" });
  });

  it("đổi tên: trùng chất liệu khác → lỗi; giữ liên kết SP (AC3)", async () => {
    const a = await createMaterial("Vàng 18K");
    await createMaterial("Vàng 24K");
    await expect(renameMaterial(a.id, "Vàng 24K")).rejects.toMatchObject({
      code: "NAME_DUPLICATE",
    });
    const { brand, line } = await makeBrandTree();
    const p = await createProduct({
      sku: "X",
      brandId: brand.id,
      productLineId: line.id,
      materialId: a.id,
    });
    await renameMaterial(a.id, "Vàng 750");
    const after = await prisma.product.findUniqueOrThrow({
      where: { id: p.id },
      include: { material: true },
    });
    expect(after.material?.name).toBe("Vàng 750");
  });
});
