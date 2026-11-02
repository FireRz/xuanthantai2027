import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Băm mật khẩu bằng scrypt (có sẵn trong Node, không cần thêm thư viện).
 * Định dạng lưu: scrypt$N$r$p$salt$hash (base64) — đổi tham số sau này vẫn kiểm tra được hash cũ.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

/** Độ dài tối thiểu của mật khẩu quản trị *(mặc định kỹ thuật)*. */
export const MIN_PASSWORD_LENGTH = 10;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, len: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, len, { N: n, r, p, maxmem: 256 * n * r }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P, KEY_LEN);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (![n, r, p].every(Number.isInteger) || expected.length === 0) return false;
  const actual = await derive(password, salt, n, r, p, expected.length);
  return timingSafeEqual(actual, expected);
}

/** Mã băm giả để tốn thời gian như thật khi tên đăng nhập không tồn tại. */
export const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(KEY_LEN).toString("base64")}`;

/**
 * Dấu vân tay ngắn của hash hiện tại, nhúng vào phiên đăng nhập:
 * đổi/đặt lại mật khẩu → dấu vân tay đổi → mọi phiên cũ hết hiệu lực.
 */
export function passwordFingerprint(hash: string): string {
  return createHash("sha256").update(hash).digest("hex").slice(0, 16);
}
