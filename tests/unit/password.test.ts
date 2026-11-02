import { describe, expect, it } from "vitest";
import { hashPassword, passwordFingerprint, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("băm rồi kiểm tra đúng/sai", async () => {
    const hash = await hashPassword("mat-khau-thu-nghiem-1");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("mat-khau-thu-nghiem-1");
    expect(await verifyPassword("mat-khau-thu-nghiem-1", hash)).toBe(true);
    expect(await verifyPassword("mat-khau-thu-nghiem-2", hash)).toBe(false);
  });

  it("cùng mật khẩu cho hash khác nhau (có muối)", async () => {
    expect(await hashPassword("abcdefghij")).not.toBe(await hashPassword("abcdefghij"));
  });

  it("hash sai định dạng thì không khớp, không ném lỗi", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "plain-text")).toBe(false);
  });

  it("dấu vân tay đổi khi hash đổi", async () => {
    const a = await hashPassword("abcdefghij");
    const b = await hashPassword("abcdefghij");
    expect(passwordFingerprint(a)).toBe(passwordFingerprint(a));
    expect(passwordFingerprint(a)).not.toBe(passwordFingerprint(b));
  });
});
