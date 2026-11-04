import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword, MIN_PASSWORD_LENGTH, passwordFingerprint } from "@/lib/password";
import { isViewerPasswordSet, setViewerPassword } from "@/server/auth/viewer-pass";
import { UnauthorizedError } from "@/server/auth/require-admin";
import { resetDb } from "./helpers";

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/server/auth", () => ({ auth: async () => session.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  clearViewerPasswordAction,
  setViewerPasswordAction,
} from "@/app/(admin)/admin/account/actions";

beforeEach(async () => {
  await resetDb();
  await prisma.appSetting.deleteMany();
  session.current = null;
});
afterAll(() => prisma.$disconnect());

async function signIn() {
  const hash = await hashPassword("mat-khau-thu-nghiem");
  const admin = await prisma.adminUser.create({ data: { username: "admin", passwordHash: hash } });
  session.current = { user: { id: admin.id }, fingerprint: passwordFingerprint(hash) };
}

function form(password: string) {
  const fd = new FormData();
  fd.set("password", password);
  return fd;
}

describe("Mật khẩu xem phân tích — Server Actions", () => {
  it("không phải admin → action ném UnauthorizedError, không đổi gì", async () => {
    await expect(
      setViewerPasswordAction({ ok: false, message: "" }, form("mat-khau-xem-moi")),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(clearViewerPasswordAction()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await isViewerPasswordSet()).toBe(false);

    // Đang có mật khẩu thì tắt không có phiên admin cũng không tắt được.
    await setViewerPassword("mat-khau-dang-dung");
    await expect(clearViewerPasswordAction()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await isViewerPasswordSet()).toBe(true);
  });

  it("admin đặt mật khẩu hợp lệ → isViewerPasswordSet true, message 'Đã lưu mật khẩu xem'", async () => {
    await signIn();
    const r = await setViewerPasswordAction({ ok: false, message: "" }, form("mat-khau-xem-moi"));
    expect(r).toEqual({ ok: true, message: "Đã lưu mật khẩu xem" });
    expect(await isViewerPasswordSet()).toBe(true);
  });

  it("mật khẩu ngắn → ok false, message nêu tối thiểu MIN_PASSWORD_LENGTH ký tự", async () => {
    await signIn();
    const r = await setViewerPasswordAction(
      { ok: false, message: "" },
      form("a".repeat(MIN_PASSWORD_LENGTH - 1)),
    );
    expect(r.ok).toBe(false);
    expect(r.message).toContain(String(MIN_PASSWORD_LENGTH));
    expect(r.message).toContain("ký tự");
    expect(await isViewerPasswordSet()).toBe(false);
  });

  it("tắt → isViewerPasswordSet false, message 'Đã tắt trang phân tích'", async () => {
    await signIn();
    await setViewerPassword("mat-khau-dang-dung");
    const r = await clearViewerPasswordAction();
    expect(r).toEqual({ ok: true, message: "Đã tắt trang phân tích" });
    expect(await isViewerPasswordSet()).toBe(false);
  });
});
