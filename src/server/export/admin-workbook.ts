import type { Writable } from "node:stream";
import ExcelJS from "exceljs";
import {
  LIST_COLUMNS,
  PRODUCT_COLUMNS,
  QUANTITY_COLUMNS,
  SHEET_GUIDE,
  SHEET_LISTS,
  SHEET_PRODUCTS,
  SHEET_QUANTITIES,
  VALIDATION_ROWS,
  type ListKey,
} from "@/lib/excel-template";

/**
 * Ghi file .xlsx đúng mẫu nhập (ADR-006): sheet SanPham, SoLuong, HuongDan và sheet ẩn DanhMuc
 * làm nguồn cho các ô chọn. Dùng cho cả file mẫu (không có dữ liệu) và xuất quản trị (F11) nên
 * file xuất luôn nhập lại được ngay.
 */

export type WorkbookLists = Record<ListKey, string[]>;

export interface ProductSheetRow {
  sku: string;
  name: string | null;
  brand: string;
  line: string;
  collection: string | null;
  material: string | null;
  productType: string | null;
  priceRange: string | null;
  price: number | null;
}

export interface QuantitySheetRow {
  sku: string;
  store: string;
  ordered: number;
  received: number;
}

export interface AdminWorkbookData {
  lists: WorkbookLists;
  /** Có thể là generator bất đồng bộ để xuất hàng trăm nghìn dòng mà không giữ hết trong bộ nhớ. */
  products: Iterable<ProductSheetRow> | AsyncIterable<ProductSheetRow>;
  quantities: Iterable<QuantitySheetRow> | AsyncIterable<QuantitySheetRow>;
}

export const EMPTY_LISTS: WorkbookLists = {
  brand: [],
  line: [],
  collection: [],
  material: [],
  productType: [],
  priceRange: [],
  store: [],
};

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const ADMIN_XLSX_TYPE = XLSX;

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFF6E0" },
} as const;

/** Danh sách chọn cho một cột của mẫu: cột → khóa trong DanhMuc. */
const PRODUCT_LIST_COLUMNS: Partial<Record<(typeof PRODUCT_COLUMNS)[number]["key"], ListKey>> = {
  brand: "brand",
  line: "line",
  collection: "collection",
  material: "material",
  productType: "productType",
  priceRange: "priceRange",
};

const colLetter = (index1: number) => String.fromCharCode(64 + index1);

function listFormula(key: ListKey, size: number): string | null {
  if (size === 0) return null;
  const col = colLetter(LIST_COLUMNS.findIndex((c) => c.key === key) + 1);
  return `${SHEET_LISTS}!$${col}$2:$${col}$${size + 1}`;
}

interface DataValidationHost {
  dataValidations: { add(range: string, rule: ExcelJS.DataValidation): void };
}

function addListValidation(
  ws: ExcelJS.Worksheet,
  column: number,
  key: ListKey,
  lists: WorkbookLists,
  prompt: string,
) {
  const formula = listFormula(key, lists[key].length);
  if (!formula) return;
  const L = colLetter(column);
  // Kiểu của exceljs không khai báo `dataValidations` trên worksheet (có ở runtime, cả chế độ stream).
  (ws as unknown as DataValidationHost).dataValidations.add(`${L}2:${L}${VALIDATION_ROWS + 1}`, {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    // Cảnh báo (không chặn): giá trị đang ẩn trên web vẫn nhập lại được; lỗi thật do bước xem trước báo.
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: "Giá trị chưa có trong danh sách",
    error:
      "Giá trị này chưa có trên web. Khi nhập file, hệ thống sẽ tự tạo mới (xem ở bước xem trước).",
    showInputMessage: true,
    prompt,
  });
}

function writeHeader(ws: ExcelJS.Worksheet, headers: readonly string[]) {
  const row = ws.addRow([...headers]);
  row.font = { bold: true };
  row.fill = HEADER_FILL;
  row.commit();
}

function guideLines(): string[][] {
  const lines: string[][] = [
    ["HƯỚNG DẪN NHẬP EXCEL — Xuân Thần Tài"],
    [""],
    ["Cách làm"],
    ["1. Điền sheet SanPham (thông tin SP) và SoLuong (SL đặt / SL đã về của từng cửa hàng)."],
    ["2. Vào trang Nhập Excel, chọn file, xem trước kết quả. Chỉ khi hết lỗi mới bấm Áp dụng."],
    [
      "3. Không sửa tên sheet và dòng tiêu đề (dòng 1). Thứ tự cột có thể đổi nhưng nên giữ nguyên.",
    ],
    [""],
    ["Quy tắc"],
    ["• Giá trị trong file GHI ĐÈ giá trị đang có trên web."],
    [
      "• Ô để TRỐNG = giữ nguyên giá trị hiện có (muốn về 0 thì gõ 0). SP mới: ô tùy chọn để trống = để trống.",
    ],
    ["• SL đã về được phép lớn hơn SL đặt."],
    ["• SP chưa có trên web → được tạo mới (bắt buộc Mã SP, Nhãn hàng, Dòng hàng)."],
    [
      "• Nhãn hàng, Dòng hàng, Bộ sưu tập, Tuổi vàng, Chủng loại, Khung giá chưa có trên web → được tự tạo khi áp dụng (xem trước sẽ liệt kê). Chỉ Cửa hàng chưa có thì báo lỗi, phải tạo ở trang Danh mục.",
    ],
    [
      "• Dòng hàng và Bộ sưu tập phải cùng nhãn với SP. Không đổi nhãn của SP nếu dòng/BST hiện có không thuộc nhãn mới.",
    ],
    [
      "• Mã SP không trùng nhau trong sheet SanPham; mỗi cặp (Mã SP, Mã cửa hàng) chỉ một dòng trong sheet SoLuong.",
    ],
    ["• Mã SP trong SoLuong phải có trong sheet SanPham của file này hoặc đã có trên web."],
    [
      "• Cặp (SP, cửa hàng) không có trong file → giữ nguyên. Tên danh mục không phân biệt hoa/thường và khoảng trắng thừa.",
    ],
    ["• Còn bất kỳ lỗi nào thì không áp dụng được: sửa file rồi tải lại."],
    [""],
    [`Sheet ${SHEET_PRODUCTS}`],
    ["Cột", "Ý nghĩa"],
    ...PRODUCT_COLUMNS.map((c) => [c.header, c.help]),
    [""],
    [`Sheet ${SHEET_QUANTITIES}`],
    ["Cột", "Ý nghĩa"],
    ...QUANTITY_COLUMNS.map((c) => [c.header, c.help]),
    [""],
    [`Sheet ${SHEET_LISTS} (đang ẩn) chứa các danh sách cho ô chọn — không cần sửa.`],
  ];
  return lines;
}

/** Ghi workbook ra một luồng (streaming — chịu được hàng trăm nghìn dòng SL). */
export async function writeAdminWorkbook(
  data: AdminWorkbookData,
  stream: Writable,
  createdAt: Date = new Date(),
): Promise<void> {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({ stream, useStyles: true });
  wb.creator = "Xuân Thần Tài 2027";
  wb.created = createdAt;

  // --- SanPham ---
  const sp = wb.addWorksheet(SHEET_PRODUCTS, { views: [{ state: "frozen", ySplit: 1 }] });
  sp.columns = PRODUCT_COLUMNS.map((c) => ({
    key: c.key,
    width: c.width,
    // Cột mã ở dạng văn bản để Excel không biến "00123" thành số.
    style: c.key === "sku" ? { numFmt: "@" } : undefined,
  }));
  writeHeader(
    sp,
    PRODUCT_COLUMNS.map((c) => c.header),
  );
  for await (const p of data.products) {
    const row = sp.addRow(
      PRODUCT_COLUMNS.map((c) => {
        switch (c.key) {
          case "sku":
            return p.sku;
          case "name":
            return p.name ?? "";
          case "brand":
            return p.brand;
          case "line":
            return p.line;
          case "collection":
            return p.collection ?? "";
          case "material":
            return p.material ?? "";
          case "productType":
            return p.productType ?? "";
          case "priceRange":
            return p.priceRange ?? "";
          case "price":
            return p.price;
        }
      }),
    );
    row.commit();
  }
  PRODUCT_COLUMNS.forEach((c, i) => {
    const key = PRODUCT_LIST_COLUMNS[c.key];
    if (key) addListValidation(sp, i + 1, key, data.lists, `Chọn ${c.header} trong danh sách`);
  });
  sp.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: PRODUCT_COLUMNS.length } };
  sp.commit();

  // --- SoLuong ---
  const sl = wb.addWorksheet(SHEET_QUANTITIES, { views: [{ state: "frozen", ySplit: 1 }] });
  sl.columns = QUANTITY_COLUMNS.map((c) => ({
    key: c.key,
    width: c.width,
    style: c.key === "sku" || c.key === "store" ? { numFmt: "@" } : undefined,
  }));
  writeHeader(
    sl,
    QUANTITY_COLUMNS.map((c) => c.header),
  );
  for await (const q of data.quantities) {
    sl.addRow([q.sku, q.store, q.ordered, q.received]).commit();
  }
  const storeCol = QUANTITY_COLUMNS.findIndex((c) => c.key === "store") + 1;
  addListValidation(sl, storeCol, "store", data.lists, "Chọn mã cửa hàng trong danh sách");
  sl.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: QUANTITY_COLUMNS.length } };
  sl.commit();

  // --- HuongDan ---
  const hd = wb.addWorksheet(SHEET_GUIDE);
  hd.columns = [{ width: 34 }, { width: 110 }];
  for (const cells of guideLines()) {
    const row = hd.addRow(cells);
    if (cells.length === 1 && cells[0] !== "") row.font = { bold: true };
    row.commit();
  }
  hd.commit();

  // --- DanhMuc (ẩn) ---
  const dm = wb.addWorksheet(SHEET_LISTS, { state: "hidden" });
  writeHeader(
    dm,
    LIST_COLUMNS.map((c) => c.header),
  );
  const height = Math.max(0, ...LIST_COLUMNS.map((c) => data.lists[c.key].length));
  for (let i = 0; i < height; i++) {
    dm.addRow(LIST_COLUMNS.map((c) => data.lists[c.key][i] ?? "")).commit();
  }
  dm.commit();

  await wb.commit();
}
