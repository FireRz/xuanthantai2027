import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { assertPasswordPolicy } from "./admin-account";
import { LOCK_WINDOW_MS, MAX_FAILED_ATTEMPTS } from "./login";

/**
 * Mật khẩu xem chung cho trang /phan-tich (ADR-012). Cấu hình nằm ở bảng app_setting:
 * chuỗi băm, phiên bản, bộ đếm sai và thời điểm khóa. Mật khẩu không bao giờ lưu hay ghi log dạng thô.
 */
export const VIEWER_COOKIE = "xtt_view";
export const VIEWER_COOKIE_MAX_AGE_S = 30 * 24 * 3600;

const K_HASH = "viewer_password_hash";
const K_VERSION = "viewer_password_version";
const K_FAILED = "viewer_failed_count";
const K_LOCKED = "viewer_locked_until";

export type ViewerVerifyResult =
  | { ok: true; cookie: string }
  | { ok: false; reason: "invalid" | "unset" }
  | { ok: false; reason: "locked"; lockedUntil: Date };

function parseVersion(value: string | undefined): number {
  const n = value === undefined ? 0 : Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

async function getVersion(): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key: K_VERSION } });
  return parseVersion(row?.value);
}

function put(key: string, value: string) {
  return prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** Đặt (hoặc đổi) mật khẩu: tăng phiên bản để mọi cookie cũ hết hiệu lực, gỡ khóa và bộ đếm sai. */
export async function setViewerPassword(password: string): Promise<void> {
  assertPasswordPolicy(password);
  const hash = await hashPassword(password);
  const next = (await getVersion()) + 1;
  await prisma.$transaction([
    put(K_HASH, hash),
    put(K_VERSION, String(next)),
    prisma.appSetting.deleteMany({ where: { key: { in: [K_FAILED, K_LOCKED] } } }),
  ]);
}

/** Tắt trang phân tích: xóa mật khẩu và tăng phiên bản (đặt lại sau này cũng không dùng lại được cookie cũ). */
export async function clearViewerPassword(): Promise<void> {
  const next = (await getVersion()) + 1;
  await prisma.$transaction([
    prisma.appSetting.deleteMany({ where: { key: { in: [K_HASH, K_FAILED, K_LOCKED] } } }),
    put(K_VERSION, String(next)),
  ]);
}

export async function isViewerPasswordSet(): Promise<boolean> {
  return (await prisma.appSetting.findUnique({ where: { key: K_HASH } })) !== null;
}

/**
 * Kiểm tra mật khẩu xem. Quy tắc khóa giống đăng nhập admin: đang khóa thì không kiểm tra
 * mật khẩu (kể cả đúng); lần sai cách lần sai trước quá 15 phút thì đếm lại từ đầu.
 * Bộ đếm dùng chung (không theo IP) vì chỉ có một mật khẩu — rủi ro khóa chung đã chấp nhận (ADR-012).
 */
export async function verifyViewerPassword(
  password: string,
  now: Date = new Date(),
): Promise<ViewerVerifyResult> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [K_HASH, K_VERSION, K_FAILED, K_LOCKED] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const hashRow = byKey.get(K_HASH);
  if (!hashRow) return { ok: false, reason: "unset" };

  const lockedRow = byKey.get(K_LOCKED);
  if (lockedRow) {
    const lockedUntil = new Date(lockedRow.value);
    if (lockedUntil > now) return { ok: false, reason: "locked", lockedUntil };
  }

  // Giữ chỗ lần đoán TRƯỚC khi chạy scrypt: tăng bộ đếm nguyên tử trong một câu lệnh, nên một loạt
  // đoán song song không thể lọt hết qua khóa. Lần sai trước cách quá 15 phút (theo đồng hồ `now`
  // truyền vào) thì đếm lại từ 1.
  const nowTs = now.toISOString();
  const cutoffTs = new Date(now.getTime() - LOCK_WINDOW_MS).toISOString();
  const [{ value }] = await prisma.$queryRaw<{ value: string }[]>(Prisma.sql`
    INSERT INTO app_setting (key, value, updated_at)
    VALUES (${K_FAILED}, '1', (${nowTs}::timestamptz AT TIME ZONE 'UTC'))
    ON CONFLICT (key) DO UPDATE SET
      value = CASE WHEN app_setting.updated_at < (${cutoffTs}::timestamptz AT TIME ZONE 'UTC')
                   THEN '1' ELSE (app_setting.value::int + 1)::text END,
      updated_at = (${nowTs}::timestamptz AT TIME ZONE 'UTC')
    RETURNING value`);
  const attempt = Number(value);
  if (attempt > MAX_FAILED_ATTEMPTS) {
    // Đã đủ số lần đoán được phép (đang chạy dở hoặc đã khóa): không kiểm tra mật khẩu nữa.
    const row = await prisma.appSetting.findUnique({ where: { key: K_LOCKED } });
    const written = row ? new Date(row.value) : null;
    const lockedUntil =
      written && written > now ? written : new Date(now.getTime() + LOCK_WINDOW_MS);
    return { ok: false, reason: "locked", lockedUntil };
  }

  if (await verifyPassword(password, hashRow.value)) {
    await prisma.appSetting.deleteMany({ where: { key: { in: [K_FAILED, K_LOCKED] } } });
    const version = parseVersion(byKey.get(K_VERSION)?.value);
    const expiresAt = new Date(now.getTime() + VIEWER_COOKIE_MAX_AGE_S * 1000);
    return { ok: true, cookie: signViewerCookie(version, expiresAt) };
  }

  if (attempt >= MAX_FAILED_ATTEMPTS) {
    await put(K_LOCKED, new Date(now.getTime() + LOCK_WINDOW_MS).toISOString());
  }
  return { ok: false, reason: "invalid" };
}

/** Không có AUTH_SECRET thì dừng hẳn, không ký bằng khóa rỗng. */
function secretKey(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Thiếu AUTH_SECRET: không thể ký hoặc đọc cookie xem phân tích");
  return secret;
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", secretKey()).update(payload).digest();
}

/** Cookie: base64url("version.expiresMs") + "." + base64url(HMAC-SHA256 của phần đầu). */
export function signViewerCookie(version: number, expiresAt: Date): string {
  const payload = Buffer.from(`${version}.${expiresAt.getTime()}`).toString("base64url");
  return `${payload}.${hmac(payload).toString("base64url")}`;
}

/** Trả về phiên bản trong cookie nếu chữ ký đúng và chưa hết hạn; ngược lại null. Hạn kiểm tra ở server. */
export function readViewerCookie(
  value: string | undefined,
  now: Date = new Date(),
): { version: number } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, sig] = parts;

  const expected = hmac(payload);
  const actual = Buffer.from(sig, "base64url");
  // Chữ ký phải đúng dạng chuẩn base64url (loại bỏ biến thể giải mã ra cùng byte).
  if (actual.toString("base64url") !== sig) return null;
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  const m = /^(\d+)\.(\d+)$/.exec(Buffer.from(payload, "base64url").toString());
  if (!m) return null;
  const version = Number(m[1]);
  const expiresMs = Number(m[2]);
  if (!Number.isSafeInteger(version) || !Number.isSafeInteger(expiresMs)) return null;
  if (expiresMs <= now.getTime()) return null;
  return { version };
}

/** Cookie hợp lệ, chưa hết hạn, đúng phiên bản hiện tại và mật khẩu đang được đặt. */
export async function isCurrentViewerCookie(
  value: string | undefined,
  now: Date = new Date(),
): Promise<boolean> {
  const parsed = readViewerCookie(value, now);
  if (!parsed) return false;
  if (!(await isViewerPasswordSet())) return false;
  return parsed.version === (await getVersion());
}

/** Có quyền xem trang phân tích: cookie xem hợp lệ, hoặc đang đăng nhập admin. */
export async function hasViewerAccess(): Promise<boolean> {
  // Nạp muộn: next/headers và Auth.js chỉ chạy được trong ngữ cảnh Next (test integration không nạp chúng).
  const { cookies } = await import("next/headers");
  const { UnauthorizedError, requireAdmin } = await import("./require-admin");
  const store = await cookies();
  if (await isCurrentViewerCookie(store.get(VIEWER_COOKIE)?.value)) return true;
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof UnauthorizedError) return false;
    throw e;
  }
}
