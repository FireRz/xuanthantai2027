import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword, passwordFingerprint } from "@/lib/password";
import { resetDb } from "./helpers";

// Giả lập phiên đăng nhập: auth() trả về session do từng test đặt.
const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/server/auth", () => ({ auth: async () => session.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { POST } from "@/app/api/blob-upload/route";
import { UnauthorizedError, requireAdmin, requireAdminPage } from "@/server/auth/require-admin";

async function makeAdminSession() {
  const hash = await hashPassword("mat-khau-thu-nghiem");
  const admin = await prisma.adminUser.create({ data: { username: "admin", passwordHash: hash } });
  return {
    admin,
    session: { user: { id: admin.id }, fingerprint: passwordFingerprint(hash) },
  };
}

const uploadRequest = () =>
  new Request("http://localhost/api/blob-upload", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token", payload: {} }),
  });

describe("requireAdmin (T02.4)", () => {
  beforeEach(async () => {
    await resetDb();
    session.current = null;
  });

  it("chưa đăng nhập → UnauthorizedError", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("phiên hợp lệ → trả về quản trị", async () => {
    const { admin, session: s } = await makeAdminSession();
    session.current = s;
    await expect(requireAdmin()).resolves.toEqual({ id: admin.id, username: "admin" });
  });

  it("đổi mật khẩu → phiên cũ bị từ chối", async () => {
    const { admin, session: s } = await makeAdminSession();
    session.current = s;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword("mat-khau-moi-123") },
    });
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("tài khoản đã bị xóa → bị từ chối", async () => {
    const { admin, session: s } = await makeAdminSession();
    session.current = s;
    await prisma.adminUser.delete({ where: { id: admin.id } });
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("requireAdminPage chuyển về /login khi chưa đăng nhập", async () => {
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("POST /api/blob-upload (T02.4)", () => {
  beforeEach(async () => {
    await resetDb();
    session.current = null;
  });

  it("chưa đăng nhập → 401", async () => {
    const res = await POST(uploadRequest());
    expect(res.status).toBe(401);
  });

  it("phiên mật khẩu cũ → 401", async () => {
    const { session: s } = await makeAdminSession();
    session.current = { ...s, fingerprint: "dau-van-tay-cu" };
    expect((await POST(uploadRequest())).status).toBe(401);
  });

  it("T07.3: đường dẫn ngoài thư mục cho phép → 400, đường dẫn ảnh SP → có token", async () => {
    const { session: s } = await makeAdminSession();
    session.current = s;
    process.env.BLOB_READ_WRITE_TOKEN ||= "vercel_blob_rw_teststore_secret123";
    const req = (pathname: string) =>
      new Request("http://localhost/api/blob-upload", {
        method: "POST",
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, callbackUrl: "http://localhost/api/blob-upload", multipart: false },
        }),
      });
    expect((await POST(req("evil/x.webp"))).status).toBe(400);
    const ok = await POST(req("products/NTT001/image.webp"));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ type: "blob.generate-client-token" });
  });

  it("quản trị hợp lệ → qua cổng (không còn 401)", async () => {
    const { session: s } = await makeAdminSession();
    session.current = s;
    expect((await POST(uploadRequest())).status).not.toBe(401);
  });
});
