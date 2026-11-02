import { PassThrough } from "node:stream";
import type { AdminWorkbookData } from "@/server/export/admin-workbook";
import { writeAdminWorkbook } from "@/server/export/admin-workbook";

/** Ghi workbook quản trị vào bộ nhớ (cho test). */
export async function workbookBuffer(data: AdminWorkbookData): Promise<Buffer> {
  const out = new PassThrough();
  const chunks: Buffer[] = [];
  out.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((res, rej) => {
    out.on("end", res);
    out.on("error", rej);
  });
  await writeAdminWorkbook(data, out);
  await done;
  return Buffer.concat(chunks);
}
