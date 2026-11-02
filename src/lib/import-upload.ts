import { upload } from "@vercel/blob/client";

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Tên file an toàn cho đường dẫn Blob (chỉ ký tự ASCII, giữ đuôi .xlsx). */
export function importPath(fileName: string): string {
  const base = fileName
    .replace(/\.xlsx$/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `imports/${base || "import"}.xlsx`;
}

/**
 * Tải file .xlsx THẲNG từ trình duyệt lên Vercel Blob (không qua server → không vướng giới hạn 4,5 MB).
 * Server chỉ cấp token cho quản trị (/api/blob-upload). Trả URL để server đọc khi xem trước / áp dụng.
 */
export async function uploadImportFile(file: File): Promise<string> {
  const res = await upload(importPath(file.name), file, {
    access: "public",
    handleUploadUrl: "/api/blob-upload",
    contentType: XLSX_TYPE,
  });
  return res.url;
}
