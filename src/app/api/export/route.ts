import { PassThrough, Readable } from "node:stream";
import { parseCatalogParams, pruneInvalidSelections } from "@/lib/catalog-params";
import { viewerFileName, writeViewerWorkbook } from "@/server/export/viewer-workbook";
import { listOwnedOptions } from "@/server/services/catalog";
import { viewerList } from "@/server/services/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Xuất Excel cho người xem (F11, công khai): nhận đúng các tham số của trang danh mục
 * (nhãn, dòng, BST, tuổi vàng, khung giá, cửa hàng, all, q, sort) và xuất toàn bộ kết quả, không phân trang.
 */
export async function GET(req: Request) {
  const raw = Object.fromEntries(new URL(req.url).searchParams);
  const owned = await listOwnedOptions();
  // Cùng cách làm sạch tham số như trang danh mục để file khớp với những gì đang xem.
  const params = pruneInvalidSelections(parseCatalogParams(raw), owned.lines, owned.cols);
  const data = await viewerList(params);

  const out = new PassThrough();
  writeViewerWorkbook(data, out).catch((err) => out.destroy(err));

  return new Response(Readable.toWeb(out) as ReadableStream, {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="${viewerFileName(data.scope, data.exportedAt)}"`,
      "Cache-Control": "no-store",
    },
  });
}
