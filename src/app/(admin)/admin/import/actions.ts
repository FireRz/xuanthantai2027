"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteFiles } from "@/server/storage/blob";
import { fetchImportFile, isImportBlobUrl } from "@/server/import/import-file";
import { previewImport } from "@/server/services/import";
import { applyImport } from "@/server/services/import-apply";
import { guarded } from "../products/guard";

const urlSchema = z.string().max(2000);

/** Đọc file đã tải lên Blob và trả bản xem trước (chưa ghi gì). */
export async function previewImportAction(blobUrl: string) {
  return guarded(async () => previewImport(await fetchImportFile(urlSchema.parse(blobUrl))));
}

/** Áp dụng file (đọc và kiểm tra lại trên dữ liệu hiện tại) rồi xóa file khỏi Blob. */
export async function applyImportAction(blobUrl: string) {
  return guarded(async () => {
    const url = urlSchema.parse(blobUrl);
    const result = await applyImport(await fetchImportFile(url));
    await deleteFiles(url).catch(() => {});
    revalidatePath("/admin/quantities");
    return result;
  });
}

/** Bỏ file đã tải lên (chọn file khác / hủy). Chỉ xóa file trong imports/ của store. */
export async function discardImportAction(blobUrl: string) {
  return guarded(async () => {
    const url = urlSchema.parse(blobUrl);
    if (isImportBlobUrl(url)) await deleteFiles(url).catch(() => {});
  });
}
