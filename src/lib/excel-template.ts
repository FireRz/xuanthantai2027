/**
 * Định nghĩa mẫu Excel dùng chung cho tạo mẫu, nhập (F08) và xuất quản trị (F11) — ADR-006, ADR-010.
 * Sửa tên sheet / cột ở đây là đổi cả ba nơi cùng lúc, nên file xuất luôn nhập lại được.
 */

export const SHEET_PRODUCTS = "SanPham";
export const SHEET_QUANTITIES = "SoLuong";
export const SHEET_GUIDE = "HuongDan";
/** Sheet ẩn chứa các danh sách cho ô chọn (data validation); khi nhập bị bỏ qua. */
export const SHEET_LISTS = "DanhMuc";

export interface TemplateColumn<K extends string> {
  key: K;
  /** Tiêu đề cột ở dòng 1 (người dùng thấy, lỗi nhập cũng ghi tên này). */
  header: string;
  width: number;
  /** Bắt buộc phải có CỘT này trong file (ô có thể trống tùy quy tắc). */
  requiredColumn: boolean;
  /** Mô tả cho sheet HuongDan. */
  help: string;
}

export type ProductKey =
  | "sku"
  | "name"
  | "brand"
  | "line"
  | "collection"
  | "material"
  | "productType"
  | "priceRange"
  | "price";
export type QuantityKey = "sku" | "store" | "ordered" | "received" | "sold" | "stock";

export const PRODUCT_COLUMNS: readonly TemplateColumn<ProductKey>[] = [
  {
    key: "sku",
    header: "Mã SP",
    width: 14,
    requiredColumn: true,
    help: "Mã sản phẩm, không trùng nhau. Mã đã có trên web thì cập nhật, chưa có thì tạo SP mới. Không dùng khoảng trắng.",
  },
  {
    key: "name",
    header: "Tên SP",
    width: 34,
    requiredColumn: false,
    help: "Tùy chọn. Để trống = giữ nguyên (SP mới: để trống).",
  },
  {
    key: "brand",
    header: "Nhãn hàng",
    width: 18,
    requiredColumn: false,
    help: "Bắt buộc với SP mới. Phải là nhãn đã có trên web (chọn trong danh sách). Để trống = giữ nguyên.",
  },
  {
    key: "line",
    header: "Dòng hàng",
    width: 18,
    requiredColumn: false,
    help: "Bắt buộc với SP mới. Phải là dòng đã có và thuộc đúng nhãn của SP. Để trống = giữ nguyên.",
  },
  {
    key: "collection",
    header: "Bộ sưu tập",
    width: 22,
    requiredColumn: false,
    help: "Tùy chọn. Phải là BST đã có và thuộc đúng nhãn của SP. Để trống = giữ nguyên (SP mới: không thuộc BST).",
  },
  {
    key: "material",
    header: "Tuổi vàng",
    width: 16,
    requiredColumn: false,
    help: "Tùy chọn. Phải là tuổi vàng đã có trên web. Để trống = giữ nguyên.",
  },
  {
    key: "productType",
    header: "Chủng loại",
    width: 16,
    requiredColumn: false,
    help: "Tùy chọn. Chủng loại chưa có trên web sẽ được tự tạo khi áp dụng. Để trống = giữ nguyên.",
  },
  {
    key: "priceRange",
    header: "Khung giá",
    width: 16,
    requiredColumn: false,
    help: "Tùy chọn. Phải là khung giá đã có trên web (chọn trong danh sách). Để trống = giữ nguyên.",
  },
  {
    key: "price",
    header: "Giá bán lẻ",
    width: 16,
    requiredColumn: false,
    help: "Tùy chọn. Số nguyên VND ≥ 0 (VD 12500000). Để trống = giữ nguyên.",
  },
];

export const QUANTITY_COLUMNS: readonly TemplateColumn<QuantityKey>[] = [
  {
    key: "sku",
    header: "Mã SP",
    width: 14,
    requiredColumn: true,
    help: "Mã SP có trong sheet SanPham của file này hoặc đã có trên web.",
  },
  {
    key: "store",
    header: "Mã cửa hàng",
    width: 14,
    requiredColumn: true,
    help: "Mã cửa hàng đã có trên web (chọn trong danh sách). Mỗi cặp (Mã SP, Mã cửa hàng) chỉ một dòng.",
  },
  {
    key: "ordered",
    header: "SL đặt",
    width: 10,
    requiredColumn: false,
    help: "Số nguyên ≥ 0. Ghi đè số hiện có. Để trống = giữ nguyên (muốn về 0 thì gõ 0).",
  },
  {
    key: "received",
    header: "SL đã về",
    width: 10,
    requiredColumn: false,
    help: "Số nguyên ≥ 0, được phép lớn hơn SL đặt. Ghi đè số hiện có. Để trống = giữ nguyên.",
  },
  {
    key: "sold",
    header: "Bán",
    width: 10,
    requiredColumn: false,
    help: "Tùy chọn. Số lượng đã bán, số nguyên ≥ 0. Ghi đè số hiện có. Để trống = giữ nguyên.",
  },
  {
    key: "stock",
    header: "Tồn",
    width: 10,
    requiredColumn: false,
    help: "Tùy chọn. Số lượng tồn, số nguyên ≥ 0. Ghi đè số hiện có. Để trống = giữ nguyên.",
  },
];

/** Cột của sheet ẩn DanhMuc: mỗi cột là một danh sách cho ô chọn. */
export const LIST_COLUMNS = [
  { key: "brand", header: "Nhãn hàng" },
  { key: "line", header: "Dòng hàng" },
  { key: "collection", header: "Bộ sưu tập" },
  { key: "material", header: "Tuổi vàng" },
  { key: "productType", header: "Chủng loại" },
  { key: "priceRange", header: "Khung giá" },
  { key: "store", header: "Mã cửa hàng" },
] as const;
export type ListKey = (typeof LIST_COLUMNS)[number]["key"];

/** Số dòng dữ liệu được gắn ô chọn (ngoài dữ liệu hiện có còn chỗ nhập thêm). */
export const VALIDATION_ROWS = 10_000;

/**
 * Chuẩn hóa chuỗi để so khớp (R15): bỏ khoảng trắng thừa, không phân biệt hoa/thường,
 * và gộp dạng Unicode (chữ Việt gõ trên Mac có thể ở dạng tổ hợp).
 */
export function normalizeText(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export const normalizeHeader = normalizeText;

/** Mã SP / mã cửa hàng so khớp không phân biệt hoa/thường. */
export const normalizeCode = (s: string) => s.normalize("NFC").trim().toUpperCase();

/** Tên cột → khóa, tra theo tiêu đề đã chuẩn hóa. */
export function headerMap<K extends string>(columns: readonly TemplateColumn<K>[]) {
  return new Map(columns.map((c) => [normalizeHeader(c.header), c.key]));
}
