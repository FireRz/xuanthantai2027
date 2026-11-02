import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";
import { hashPassword } from "../../src/lib/password";
import { prisma } from "../../src/server/db";

/** Tài khoản quản trị tạm cho một test: tên và mật khẩu ngẫu nhiên, không ghi vào mã nguồn. */
export async function createTestAdmin() {
  const username = `e2e-${randomBytes(4).toString("hex")}`;
  const password = randomBytes(12).toString("hex");
  await prisma.adminUser.create({
    data: { username, passwordHash: await hashPassword(password) },
  });
  return {
    username,
    password,
    cleanup: () => prisma.adminUser.deleteMany({ where: { username } }),
  };
}

export async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/** PNG một màu (chỉ dùng cho test, không cần thư viện ảnh). */
export function makePng(width: number, height: number, [r, g, b]: [number, number, number]) {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 2; // RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
