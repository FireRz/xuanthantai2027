import type { Writable } from "node:stream";
import { regionLabel } from "@/lib/region";
import ExcelJS from "exceljs";
import { EMPTY, formatDateTime, formatInt, orDash } from "@/lib/format";
import type { ViewerExport } from "@/server/services/export";

export const VIEWER_SHEET = "DanhSach";

/** Dòng tiêu đề (1–4) rồi đến dòng tên cột; dữ liệu bắt đầu ngay sau. */
export const VIEWER_HEADER_ROW = 5;

export const VIEWER_COLUMNS = [
  { header: "Mã SP", key: "sku", width: 14 },
  { header: "Tên", key: "name", width: 34 },
  { header: "Nhãn", key: "brand", width: 16 },
  { header: "Dòng", key: "line", width: 16 },
  { header: "BST", key: "collection", width: 22 },
  { header: "Tuổi vàng", key: "material", width: 16 },
  { header: "Giá (₫)", key: "price", width: 16 },
  { header: "SL đặt", key: "ordered", width: 10 },
  { header: "SL đã về", key: "received", width: 10 },
  { header: "Còn thiếu", key: "shortage", width: 11 },
  { header: "Tỷ lệ về", key: "rate", width: 10 },
  { header: "Link ảnh", key: "image", width: 40 },
] as const;

/** Phạm vi số liệu ghi trên tiêu đề file. */
export function scopeText(scope: ViewerExport["scope"]): string {
  if (scope.kind === "total") return "Tổng hệ thống";
  if (scope.kind === "region") return `${regionLabel(scope.region)} (tổng các cửa hàng)`;
  return `Cửa hàng ${scope.name} (${scope.code})`;
}

/** Phần trăm làm tròn xuống 1 chữ số thập phân như trên trang (99,96% không thành 100%). */
function rateCell(rate: number | null): number | string {
  return rate === null ? EMPTY : Math.floor(rate * 1000 + 1e-9) / 1000;
}

/** Tên file tải về: phạm vi + thời điểm xuất (chỉ ký tự ASCII an toàn). */
export function viewerFileName(scope: ViewerExport["scope"], at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const who =
    scope.kind === "total"
      ? "tong-he-thong"
      : scope.kind === "region"
        ? `khu-vuc-${scope.region.normalize("NFD").replace(/[^A-Za-z0-9_-]/g, "")}`
        : scope.code.replace(/[^A-Za-z0-9_-]/g, "");
  return `danh-sach-san-pham_${who}_${p.year}${p.month}${p.day}-${p.hour}${p.minute}.xlsx`;
}

/**
 * Ghi file .xlsx người xem (F11) ra một luồng: 4 dòng tiêu đề (tên file, phạm vi số liệu, thời điểm
 * xuất, số SP), dòng tên cột, rồi mỗi SP một dòng theo đúng thứ tự trên trang. Số liệu ghi dạng số.
 */
export async function writeViewerWorkbook(data: ViewerExport, stream: Writable): Promise<void> {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true });
  wb.creator = "Xuân Thần Tài 2027";
  wb.created = data.exportedAt;
  const ws = wb.addWorksheet(VIEWER_SHEET, {
    views: [{ state: "frozen", ySplit: VIEWER_HEADER_ROW }],
  });
  ws.columns = VIEWER_COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  const title = ws.addRow(["Danh sách sản phẩm — Xuân Thần Tài 2027"]);
  title.font = { bold: true, size: 14 };
  title.commit();
  ws.addRow([`Phạm vi số liệu: ${scopeText(data.scope)}`]).commit();
  ws.addRow([`Thời điểm xuất: ${formatDateTime(data.exportedAt)}`]).commit();
  ws.addRow([`Số sản phẩm: ${formatInt(data.items.length)}`]).commit();

  const head = ws.addRow(VIEWER_COLUMNS.map((c) => c.header));
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF6E0" } };
  head.commit();

  for (const it of data.items) {
    const m = it.metrics;
    const row = ws.addRow([
      it.sku,
      orDash(it.name),
      it.brandName,
      it.lineName,
      orDash(it.collectionName),
      orDash(it.materialName),
      it.priceVnd,
      m.ordered,
      m.received,
      m.shortage,
      rateCell(m.rate),
      it.imageUrl ?? "",
    ]);
    row.getCell(7).numFmt = "#,##0";
    row.getCell(11).numFmt = "0.0%";
    row.getCell(11).alignment = { horizontal: "right" };
    row.commit();
  }

  ws.autoFilter = {
    from: { row: VIEWER_HEADER_ROW, column: 1 },
    to: { row: VIEWER_HEADER_ROW, column: VIEWER_COLUMNS.length },
  };
  ws.commit();
  await wb.commit();
}
