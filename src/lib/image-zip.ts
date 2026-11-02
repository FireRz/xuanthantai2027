import JSZip from "jszip";
import type { BatchFile } from "@/lib/image-batch";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path;
const isZip = (f: { name: string; type: string }) =>
  /\.zip$/i.test(f.name) ||
  f.type === "application/zip" ||
  f.type === "application/x-zip-compressed";

/** Tối đa số file lấy từ zip để không treo trình duyệt (3.000 SP, mỗi SP 1 ảnh). */
export const MAX_ZIP_ENTRIES = 5000;

export interface ExpandResult {
  files: BatchFile[];
  /** Thông báo cho file không đọc được (zip hỏng, quá nhiều file...). */
  errors: string[];
}

/**
 * Gom file người dùng chọn thành danh sách ảnh phẳng: file thường giữ nguyên,
 * .zip được giải nén NGAY TRÊN TRÌNH DUYỆT (bỏ thư mục, file ẩn, `__MACOSX`).
 */
export async function expandFiles(input: File[]): Promise<ExpandResult> {
  const files: BatchFile[] = [];
  const errors: string[] = [];
  for (const f of input) {
    if (!isZip(f)) {
      files.push({ name: baseName(f.name), blob: f });
      continue;
    }
    try {
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const entries = Object.values(zip.files).filter(
        (e) =>
          !e.dir &&
          !e.name.startsWith("__MACOSX/") &&
          !baseName(e.name).startsWith(".") &&
          baseName(e.name) !== "Thumbs.db",
      );
      if (entries.length > MAX_ZIP_ENTRIES) {
        errors.push(`${f.name}: quá ${MAX_ZIP_ENTRIES} file, hãy chia nhỏ`);
        continue;
      }
      for (const e of entries) {
        const name = baseName(e.name);
        const ext = name.split(".").pop()?.toLowerCase() ?? "";
        const bytes = await e.async("uint8array");
        // Giữ nguyên tên để mục "không hợp lệ" báo đúng file; MIME suy từ đuôi.
        files.push({
          name,
          blob: new Blob([bytes as BlobPart], { type: MIME_BY_EXT[ext] ?? "" }),
        });
      }
    } catch {
      errors.push(`${f.name}: không đọc được file zip`);
    }
  }
  return { files, errors };
}
