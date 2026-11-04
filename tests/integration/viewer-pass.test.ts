import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { LOCK_WINDOW_MS, MAX_FAILED_ATTEMPTS } from "@/server/auth/login";
import {
  clearViewerPassword,
  isCurrentViewerCookie,
  isViewerPasswordSet,
  readViewerCookie,
  setViewerPassword,
  signViewerCookie,
  verifyViewerPassword,
} from "@/server/auth/viewer-pass";
import { resetDb } from "./helpers";

const PASSWORD = "mat-khau-xem-chung";

async function okCookie(password = PASSWORD, now?: Date): Promise<string> {
  const r = await verifyViewerPassword(password, now);
  if (!r.ok) throw new Error(`Kỳ vọng ok, nhận ${r.reason}`);
  return r.cookie;
}

describe("mật khẩu xem chung (ADR-012)", () => {
  beforeEach(resetDb);

  it("chưa đặt → verify trả unset, isViewerPasswordSet false", async () => {
    expect(await isViewerPasswordSet()).toBe(false);
    expect(await verifyViewerPassword(PASSWORD)).toEqual({ ok: false, reason: "unset" });
  });

  it("đặt rồi verify đúng → ok + cookie đọc lại được với version hiện tại", async () => {
    await setViewerPassword(PASSWORD);
    expect(await isViewerPasswordSet()).toBe(true);
    const cookie = await okCookie();
    const version = Number(
      (await prisma.appSetting.findUniqueOrThrow({ where: { key: "viewer_password_version" } }))
        .value,
    );
    expect(readViewerCookie(cookie)).toEqual({ version });
    expect(await isCurrentViewerCookie(cookie)).toBe(true);
  });

  it("sai mật khẩu → invalid; không lưu mật khẩu dạng thô", async () => {
    await setViewerPassword(PASSWORD);
    expect(await verifyViewerPassword("sai-mat-khau")).toEqual({ ok: false, reason: "invalid" });
    const rows = await prisma.appSetting.findMany();
    expect(rows.some((r) => r.value.includes(PASSWORD))).toBe(false);
  });

  it("sai 5 lần → locked; lần 6 đúng mật khẩu vẫn locked; sau 15 phút + 1ms thì đúng là ok", async () => {
    await setViewerPassword(PASSWORD);
    const t0 = new Date();
    for (let i = 0; i < 5; i++) {
      expect(await verifyViewerPassword("sai", t0)).toEqual({ ok: false, reason: "invalid" });
    }
    const sixth = await verifyViewerPassword(PASSWORD, t0);
    expect(sixth).toEqual({
      ok: false,
      reason: "locked",
      lockedUntil: new Date(t0.getTime() + LOCK_WINDOW_MS),
    });
    const after = new Date(t0.getTime() + LOCK_WINDOW_MS + 1);
    expect((await verifyViewerPassword(PASSWORD, after)).ok).toBe(true);
  });

  it("lần sai cách lần trước quá 15 phút thì đếm lại từ đầu", async () => {
    await setViewerPassword(PASSWORD);
    const t0 = new Date();
    for (let i = 0; i < 4; i++) await verifyViewerPassword("sai", t0);
    // Lần sai thứ 5 nhưng muộn hơn cửa sổ → chỉ tính là lần sai đầu tiên, chưa khóa.
    const late = new Date(t0.getTime() + LOCK_WINDOW_MS + 60_000);
    expect(await verifyViewerPassword("sai", late)).toEqual({ ok: false, reason: "invalid" });
    expect((await verifyViewerPassword(PASSWORD, late)).ok).toBe(true);
  });

  it("10 lần đoán sai song song vẫn bị khóa (bộ đếm tăng nguyên tử)", async () => {
    await setViewerPassword(PASSWORD);
    const now = new Date();
    await Promise.all(Array.from({ length: 10 }, () => verifyViewerPassword("sai", now)));
    // Lần đến sau khi đã khóa thì không tăng nữa, nên chỉ cần ít nhất 5 lần được đếm (không mất lần nào).
    const count = Number(
      (await prisma.appSetting.findUniqueOrThrow({ where: { key: "viewer_failed_count" } })).value,
    );
    expect(count).toBeGreaterThanOrEqual(MAX_FAILED_ATTEMPTS);
    const r = await verifyViewerPassword(PASSWORD, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("locked");
  });

  it("đúng mật khẩu thì xóa bộ đếm sai", async () => {
    await setViewerPassword(PASSWORD);
    for (let i = 0; i < 4; i++) await verifyViewerPassword("sai");
    expect((await verifyViewerPassword(PASSWORD)).ok).toBe(true);
    for (let i = 0; i < 4; i++) {
      expect(await verifyViewerPassword("sai")).toEqual({ ok: false, reason: "invalid" });
    }
  });

  it("đổi mật khẩu → isCurrentViewerCookie(cookie cũ) false, cookie mới true", async () => {
    await setViewerPassword(PASSWORD);
    const oldCookie = await okCookie();
    await setViewerPassword("mat-khau-moi-123");
    expect(await isCurrentViewerCookie(oldCookie)).toBe(false);
    const newCookie = await okCookie("mat-khau-moi-123");
    expect(await isCurrentViewerCookie(newCookie)).toBe(true);
  });

  it("đổi mật khẩu gỡ khóa đang có", async () => {
    await setViewerPassword(PASSWORD);
    for (let i = 0; i < 5; i++) await verifyViewerPassword("sai");
    expect((await verifyViewerPassword(PASSWORD)).ok).toBe(false);
    await setViewerPassword("mat-khau-moi-123");
    expect((await verifyViewerPassword("mat-khau-moi-123")).ok).toBe(true);
  });

  it("clearViewerPassword → isCurrentViewerCookie(cookie đang hợp lệ) false", async () => {
    await setViewerPassword(PASSWORD);
    const cookie = await okCookie();
    expect(await isCurrentViewerCookie(cookie)).toBe(true);
    await clearViewerPassword();
    expect(await isCurrentViewerCookie(cookie)).toBe(false);
  });

  it("clearViewerPassword → verify trả unset", async () => {
    await setViewerPassword(PASSWORD);
    await clearViewerPassword();
    expect(await isViewerPasswordSet()).toBe(false);
    expect(await verifyViewerPassword(PASSWORD)).toEqual({ ok: false, reason: "unset" });
  });

  it("đặt lại sau khi tắt: cookie của lần đặt trước vẫn không dùng được", async () => {
    await setViewerPassword(PASSWORD);
    const cookie = await okCookie();
    await clearViewerPassword();
    await setViewerPassword(PASSWORD);
    expect(await isCurrentViewerCookie(cookie)).toBe(false);
  });

  it("mật khẩu ngắn hơn MIN_PASSWORD_LENGTH → setViewerPassword ném lỗi", async () => {
    await expect(setViewerPassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow();
    expect(await isViewerPasswordSet()).toBe(false);
  });
});

describe("cookie xem chung (ký HMAC)", () => {
  const future = () => new Date(Date.now() + 60_000);

  it("cookie bị sửa 1 ký tự → null", () => {
    const cookie = signViewerCookie(3, future());
    expect(readViewerCookie(cookie)).toEqual({ version: 3 });
    // Sửa ở phần nội dung, ở phần chữ ký, và đổi sang phiên bản khác.
    for (const i of [0, cookie.indexOf(".") + 1, cookie.length - 1]) {
      const ch = cookie[i] === "A" ? "B" : "A";
      expect(readViewerCookie(cookie.slice(0, i) + ch + cookie.slice(i + 1))).toBeNull();
    }
    const other = signViewerCookie(4, future());
    const forged = other.split(".")[0] + "." + cookie.split(".")[1];
    expect(readViewerCookie(forged)).toBeNull();
  });

  it("cookie hết hạn → null (kiểm tra ở server, không dựa Max-Age)", () => {
    const expiresAt = new Date("2026-11-05T00:00:00Z");
    const cookie = signViewerCookie(1, expiresAt);
    expect(readViewerCookie(cookie, new Date(expiresAt.getTime() - 1))).toEqual({ version: 1 });
    expect(readViewerCookie(cookie, expiresAt)).toBeNull();
    expect(readViewerCookie(cookie, new Date(expiresAt.getTime() + 1))).toBeNull();
  });

  it("giá trị rác hoặc thiếu → null", () => {
    for (const v of [undefined, "", "abc", "a.b.c", ".", "a.", ".b"]) {
      expect(readViewerCookie(v)).toBeNull();
    }
  });

  it("không có AUTH_SECRET → ném lỗi thay vì ký bằng khóa rỗng", () => {
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      expect(() => signViewerCookie(1, future())).toThrow(/AUTH_SECRET/);
      expect(() => readViewerCookie("a.b")).toThrow(/AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = saved;
    }
  });
});
