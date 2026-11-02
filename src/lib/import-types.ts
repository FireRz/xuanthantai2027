/** Kiểu dữ liệu kết quả xem trước nhập Excel — dùng chung giữa server và màn hình xem trước (không import server). */

export type ImportSheet = "SanPham" | "SoLuong" | "File";

/** Một lỗi: chỉ rõ sheet, dòng, cột và lý do (AC5). `row` = 0 khi lỗi cấp file. */
export interface ImportIssue {
  sheet: ImportSheet;
  row: number;
  column: string;
  /** Mã SP hoặc "Mã SP / Mã CH" để dễ tìm. */
  key: string;
  reason: string;
}

export interface FieldChange {
  column: string;
  /** Giá trị cũ đã định dạng ("—" nếu chưa có). */
  old: string;
  new: string;
}

export interface ProductItem {
  row: number;
  sku: string;
  kind: "new" | "changed";
  changes: FieldChange[];
}

export interface QuantityItem {
  row: number;
  sku: string;
  store: string;
  old: { ordered: number; received: number };
  new: { ordered: number; received: number };
}

export interface ImportSummary {
  newProducts: number;
  changedProducts: number;
  unchangedProducts: number;
  changedQuantities: number;
  unchangedQuantities: number;
  errors: number;
}

/** Số mục chi tiết tối đa gửi về trình duyệt mỗi loại (tổng số vẫn đếm đủ trong `summary`). */
export const PREVIEW_DETAIL_LIMIT = 1000;

export interface ImportPreview {
  summary: ImportSummary;
  /** Có sheet tương ứng trong file không. */
  sheets: { products: boolean; quantities: boolean };
  issues: ImportIssue[];
  productItems: ProductItem[];
  quantityItems: QuantityItem[];
  /** Danh sách chi tiết đã bị cắt bớt (xem `summary` để biết tổng). */
  truncated: { issues: boolean; productItems: boolean; quantityItems: boolean };
}
