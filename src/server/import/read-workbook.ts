import ExcelJS from "exceljs";
import { DomainError } from "@/server/errors";
import { cellText } from "@/lib/excel-values";
import {
  PRODUCT_COLUMNS,
  QUANTITY_COLUMNS,
  SHEET_PRODUCTS,
  SHEET_QUANTITIES,
  headerMap,
  normalizeText,
  type ProductKey,
  type QuantityKey,
  type TemplateColumn,
} from "@/lib/excel-template";

/**
 * Bộ đọc file nhập (T08.6): ExcelJS → dòng chuẩn hóa. Ô trống = undefined, chữ được cắt khoảng trắng,
 * số đọc dạng chữ, dòng trống hoàn toàn bị bỏ qua. Số dòng giữ nguyên như trong Excel để báo lỗi chính xác.
 */

export interface SheetRow<K extends string> {
  /** Số dòng trong Excel (dòng 1 là tiêu đề). */
  row: number;
  cells: Partial<Record<K, string>>;
}

export interface SheetData<K extends string> {
  rows: SheetRow<K>[];
  /** Tiêu đề bắt buộc mà sheet không có. */
  missingColumns: string[];
}

export interface WorkbookData {
  /** null = file không có sheet này. */
  products: SheetData<ProductKey> | null;
  quantities: SheetData<QuantityKey> | null;
}

function readSheet<K extends string>(
  ws: ExcelJS.Worksheet,
  columns: readonly TemplateColumn<K>[],
): SheetData<K> {
  const byHeader = headerMap(columns);
  const colOf = new Map<K, number>();
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const text = cellText(cell.value);
    const key = text === undefined ? undefined : byHeader.get(normalizeText(text));
    if (key !== undefined && !colOf.has(key)) colOf.set(key, col);
  });
  const missingColumns = columns
    .filter((c) => c.requiredColumn && !colOf.has(c.key))
    .map((c) => c.header);

  const rows: SheetRow<K>[] = [];
  if (missingColumns.length > 0) return { rows, missingColumns };
  const last = ws.rowCount;
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const cells: Partial<Record<K, string>> = {};
    let any = false;
    for (const [key, col] of colOf) {
      const text = cellText(row.getCell(col).value);
      if (text !== undefined) {
        cells[key] = text;
        any = true;
      }
    }
    if (any) rows.push({ row: r, cells });
  }
  return { rows, missingColumns };
}

/** Đọc file .xlsx (Buffer) thành dữ liệu chuẩn hóa của hai sheet SanPham / SoLuong. */
export async function readWorkbook(file: Buffer | ArrayBuffer): Promise<WorkbookData> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(file as ArrayBuffer);
  } catch {
    throw new DomainError(
      "IMPORT_FILE_INVALID",
      "Không đọc được file. Hãy dùng file .xlsx (Excel) theo mẫu của hệ thống.",
    );
  }
  const sheet = (name: string) =>
    wb.worksheets.find((w) => normalizeText(w.name) === normalizeText(name));
  const sp = sheet(SHEET_PRODUCTS);
  const sl = sheet(SHEET_QUANTITIES);
  return {
    products: sp ? readSheet(sp, PRODUCT_COLUMNS) : null,
    quantities: sl ? readSheet(sl, QUANTITY_COLUMNS) : null,
  };
}
