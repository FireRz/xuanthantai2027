import { DomainError } from "@/server/errors";
import { IMPORT_PREFIX } from "@/server/storage/upload-policy";

/** Giới hạn dung lượng file nhập, khớp chính sách cấp token (upload-policy). */
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

/** URL phải là file trong thư mục `imports/` của chính store Blob (không đọc URL tùy ý — chống SSRF). */
export function isImportBlobUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || !BLOB_HOST.test(u.hostname)) return false;
  const path = decodeURIComponent(u.pathname).replace(/^\//, "");
  return path.startsWith(IMPORT_PREFIX) && !path.includes("..");
}

/** Tải file nhập từ Blob về bộ nhớ. */
export async function fetchImportFile(url: string): Promise<Buffer> {
  if (!isImportBlobUrl(url)) {
    throw new DomainError("IMPORT_URL_INVALID", "Địa chỉ file nhập không hợp lệ");
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new DomainError("IMPORT_FILE_UNREADABLE", "Không đọc được file đã tải lên. Hãy tải lại.");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMPORT_BYTES) {
    throw new DomainError("IMPORT_FILE_TOO_LARGE", "File quá lớn (tối đa 25 MB)");
  }
  return buf;
}
