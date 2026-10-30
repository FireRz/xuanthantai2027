import { describe, expect, it, vi } from "vitest";
import { getPayloadFromClientToken } from "@vercel/blob/client";

vi.mock("server-only", () => ({}));

const { createUploadToken, deleteFiles, putFile } = await import("@/server/storage/blob");

// Test thật với store Blob dev: cần BLOB_READ_WRITE_TOKEN trong .env (Vercel → Storage → Blob).
const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;

describe.skipIf(!hasToken)("T01.9 — adapter Vercel Blob (store dev)", () => {
  it("tải lên, đọc lại được rồi xóa", async () => {
    const file = await putFile("test/t01-9.txt", "Xuân Thần Tài 2027", "text/plain");
    expect(file.url).toMatch(/^https:\/\/.+\/test\/t01-9-.+\.txt$/);

    const res = await fetch(file.url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Xuân Thần Tài 2027");

    await deleteFiles(file.url);
    // CDN có thể còn giữ bản cache ngắn; kiểm tra qua API head của Blob.
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    await expect(
      head(file.url, { token: process.env.BLOB_READ_WRITE_TOKEN }),
    ).rejects.toBeInstanceOf(BlobNotFoundError);
  });
});

describe("T01.9 — client token và lỗi cấu hình", () => {
  it("cấp client token giới hạn đúng đường dẫn, loại file, dung lượng", async () => {
    // Token được ký cục bộ, không gọi mạng → chạy được với token giả.
    const saved = process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_READ_WRITE_TOKEN ||= "vercel_blob_rw_teststore_secret123";
    const token = await createUploadToken({
      pathname: "images/NTT001.webp",
      allowedContentTypes: ["image/webp"],
      maximumSizeInBytes: 4_500_000,
    });
    const payload = getPayloadFromClientToken(token);
    expect(payload.pathname).toBe("images/NTT001.webp");
    expect(payload.allowedContentTypes).toEqual(["image/webp"]);
    expect(payload.maximumSizeInBytes).toBe(4_500_000);
    expect(payload.validUntil).toBeGreaterThan(Date.now());
    process.env.BLOB_READ_WRITE_TOKEN = saved;
    if (saved === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("báo lỗi rõ ràng", async () => {
    const saved = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
      await expect(deleteFiles("https://x/y")).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/);
    } finally {
      if (saved !== undefined) process.env.BLOB_READ_WRITE_TOKEN = saved;
    }
  });
});
