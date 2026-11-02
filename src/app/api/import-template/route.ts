import { PassThrough, Readable } from "node:stream";
import { UnauthorizedError, requireAdmin, unauthorizedResponse } from "@/server/auth/require-admin";
import { ADMIN_XLSX_TYPE, writeAdminWorkbook } from "@/server/export/admin-workbook";
import { templateData } from "@/server/services/export-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Tải file mẫu nhập Excel (chỉ quản trị) — danh sách chọn lấy từ dữ liệu hiện có. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  const data = await templateData();
  const out = new PassThrough();
  writeAdminWorkbook(data, out).catch((err) => out.destroy(err));
  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": ADMIN_XLSX_TYPE,
      "Content-Disposition": 'attachment; filename="mau-nhap-excel.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
