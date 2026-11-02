import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword, passwordFingerprint } from "@/lib/password";
import { makeBrandTree, resetDb } from "./helpers";

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/server/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createItemAction,
  deleteItemAction,
  getHideImpactAction,
  setActiveAction,
  updateItemAction,
} from "@/app/(admin)/admin/master-data/actions";

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

describe("T06.5 — Server Actions danh mục đều qua requireAdmin (ADR-004 A3)", () => {
  it("chưa đăng nhập → mọi thao tác bị từ chối và không ghi gì", async () => {
    const { brand } = await makeBrandTree();
    const results = [
      await createItemAction("brand", { name: "Nhãn mới" }),
      await updateItemAction("brand", brand.id, { name: "Đổi tên" }),
      await getHideImpactAction("brand", brand.id),
      await setActiveAction("brand", brand.id, false),
      await deleteItemAction("collection", (await prisma.collection.findFirstOrThrow()).id),
    ];
    for (const r of results) expect(r).toMatchObject({ ok: false });
    expect(await prisma.brand.count()).toBe(1);
    expect((await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } })).name).toBe("Nhãn A");
    expect((await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } })).active).toBe(true);
    expect(await prisma.collection.count()).toBe(1);
  });

  it("đã đăng nhập → thêm / sửa / ẩn / xóa chạy; lỗi nghiệp vụ trả về thông báo", async () => {
    await signIn();
    expect(await createItemAction("brand", { name: "Nhãn X" })).toMatchObject({ ok: true });
    const brand = await prisma.brand.findFirstOrThrow({ where: { name: "Nhãn X" } });

    expect(await createItemAction("line", { name: "Nhẫn" })).toMatchObject({
      ok: false,
      error: expect.stringContaining("chọn nhãn"),
    });
    expect(await createItemAction("line", { name: "Nhẫn", brandId: brand.id })).toMatchObject({
      ok: true,
    });
    expect(await createItemAction("line", { name: "NHẪN", brandId: brand.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining("đã tồn tại"),
    });

    const impact = await getHideImpactAction("brand", brand.id);
    expect(impact).toMatchObject({ ok: true, data: { affected: 0 } });
    expect(await setActiveAction("brand", brand.id, false)).toMatchObject({ ok: true });
    expect((await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } })).active).toBe(false);
    expect(await deleteItemAction("brand", brand.id)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Hãy ẩn"),
    });
  });

  it("id không hợp lệ → lỗi, không ném ngoại lệ", async () => {
    await signIn();
    expect(await setActiveAction("brand", "khong-phai-uuid", false)).toMatchObject({ ok: false });
  });
});
