import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword, passwordFingerprint } from "@/lib/password";
import { makeBrandTree, resetDb } from "./helpers";

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/server/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/blob", () => ({ deleteFiles: async () => {} }));

import {
  attachImageAction,
  createProductAction,
  setActiveAction,
  updateProductAction,
} from "@/app/(admin)/admin/products/actions";

beforeEach(async () => {
  await resetDb();
  session.current = null;
});
afterAll(() => prisma.$disconnect());

async function signIn() {
  const hash = await hashPassword("mat-khau-thu-nghiem");
  const admin = await prisma.adminUser.create({ data: { username: "admin", passwordHash: hash } });
  session.current = { user: { id: admin.id }, fingerprint: passwordFingerprint(hash) };
}

describe("F07 — Server Actions sản phẩm đều qua requireAdmin (ADR-004 A3)", () => {
  it("chưa đăng nhập → mọi thao tác bị từ chối và không ghi gì", async () => {
    const t = await makeBrandTree();
    const input = { sku: "NTT001", brandId: t.brand.id, productLineId: t.line.id };
    const p = await prisma.product.create({ data: input });
    const results = [
      await createProductAction({ ...input, sku: "NTT002" }),
      await updateProductAction(p.id, { ...input, name: "Đổi" }),
      await setActiveAction([p.id], false),
      await attachImageAction(
        p.id,
        "https://a.blob.vercel-storage.com/products/NTT001/i.webp",
        "x",
      ),
    ];
    for (const r of results) expect(r).toMatchObject({ ok: false });
    expect(await prisma.product.count()).toBe(1);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after).toMatchObject({ name: null, active: true, imageUrl: null });
  });

  it("đã đăng nhập → tạo / sửa / ẩn chạy; lỗi nghiệp vụ trả thông báo", async () => {
    await signIn();
    const t = await makeBrandTree();
    const input = { sku: "NTT001", brandId: t.brand.id, productLineId: t.line.id };
    const created = await createProductAction(input);
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) return;
    const id = created.data!.id;
    expect(await createProductAction({ ...input, sku: "ntt001" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("đã tồn tại"),
    });
    expect(await createProductAction({ ...input, sku: "X", productLineId: "" })).toMatchObject({
      ok: false,
    });
    expect(await updateProductAction(id, { ...input, name: "Mới" })).toMatchObject({ ok: true });
    expect(await setActiveAction([id], false)).toMatchObject({ ok: true, data: { count: 1 } });
    expect((await prisma.product.findUniqueOrThrow({ where: { id } })).active).toBe(false);
    expect(await setActiveAction(["không-phải-id"], false)).toMatchObject({ ok: false });
  });
});
