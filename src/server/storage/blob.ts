import "server-only";
import { del, put, type PutBlobResult } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

/**
 * Adapter Vercel Blob (ADR-005): mọi file (ảnh SP, file Excel nhập) nằm trên Blob.
 * File lớn tải thẳng từ trình duyệt bằng client token — chỉ cấp cho admin
 * (route /api/blob-upload kiểm tra requireAdmin trước khi gọi createUploadToken).
 */

function readWriteToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Thiếu BLOB_READ_WRITE_TOKEN (xem .env.example)");
  return token;
}

export interface StoredFile {
  url: string;
  pathname: string;
}

/** Ghi file từ server. Hậu tố ngẫu nhiên để URL không đoán được và ảnh mới không bị cache cũ. */
export async function putFile(
  pathname: string,
  body: Blob | Buffer | ArrayBuffer | ReadableStream | string,
  contentType?: string,
): Promise<StoredFile> {
  const res: PutBlobResult = await put(pathname, body, {
    access: "public",
    addRandomSuffix: true,
    contentType,
    token: readWriteToken(),
  });
  return { url: res.url, pathname: res.pathname };
}

/** Xóa một hoặc nhiều file theo URL (ảnh cũ khi thay ảnh, file import đã xử lý). */
export async function deleteFiles(urls: string | string[]): Promise<void> {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (list.length === 0) return;
  await del(list, { token: readWriteToken() });
}

export interface UploadTokenOptions {
  pathname: string;
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
  /** Thời hạn token, mặc định 10 phút. */
  ttlMs?: number;
}

/** Cấp client token cho trình duyệt tải một file lên đúng `pathname`. */
export function createUploadToken(opts: UploadTokenOptions): Promise<string> {
  return generateClientTokenFromReadWriteToken({
    token: readWriteToken(),
    pathname: opts.pathname,
    addRandomSuffix: true,
    allowedContentTypes: opts.allowedContentTypes,
    maximumSizeInBytes: opts.maximumSizeInBytes,
    validUntil: Date.now() + (opts.ttlMs ?? 10 * 60_000),
  });
}
