import { PassThrough, Readable } from "node:stream";
import { UnauthorizedError, requireAdmin, unauthorizedResponse } from "@/server/auth/require-admin";
import { ADMIN_XLSX_TYPE, writeAdminWorkbook } from "@/server/export/admin-workbook";
import { adminExportFileName } from "@/server/export/admin-file-name";
import { adminTemplate } from "@/server/services/export-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Xuất 3.000 SP × 100 cửa hàng (~300.000 dòng SL) cần nhiều thời gian hơn mặc định.
export const maxDuration = 300;

/** Xuất toàn bộ dữ liệu theo đúng mẫu nhập (chỉ quản trị) — sửa rồi nhập lại được ngay (F11). */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  const at = new Date();
  const data = await adminTemplate();
  const out = new PassThrough();
  writeAdminWorkbook(data, out, at).catch((err) => out.destroy(err));
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": ADMIN_XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${adminExportFileName(at)}"`,
      "Cache-Control": "no-store",
    },
  });
}
