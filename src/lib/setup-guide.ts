/** Số lượng hiện có của từng danh mục, dùng để biết đã làm tới bước nào. */
export interface MasterDataCounts {
  stores: number;
  brands: number;
  lines: number;
  collections: number;
  materials: number;
}

export interface SetupStep {
  key: "stores" | "brands" | "lines" | "collections" | "materials" | "excel";
  title: string;
  detail: string;
  done: boolean;
  /** Bước không bắt buộc (SP vẫn tạo được khi để trống) — ADR-008 P4. */
  optional?: boolean;
  /** Trang quản trị để làm bước này; không có nếu chưa tới phiên làm trang đó. */
  href?: string;
}

/**
 * Thứ tự nhập dữ liệu ban đầu (F06 T06.6, SESSIONS phiên 9): cửa hàng → nhãn → dòng / BST →
 * tuổi vàng → tải mẫu Excel. File Excel chỉ chọn được những giá trị đã có (ADR-008 R5).
 */
export function getSetupSteps(c: MasterDataCounts): SetupStep[] {
  return [
    {
      key: "stores",
      title: "Tạo cửa hàng",
      detail: "Nhập mã (duy nhất) và tên từng cửa hàng.",
      done: c.stores > 0,
      href: "/admin/master-data?tab=stores",
    },
    {
      key: "brands",
      title: "Tạo nhãn hàng",
      detail: "Mỗi dòng hàng và bộ sưu tập phải thuộc một nhãn nên tạo nhãn trước.",
      done: c.brands > 0,
      href: "/admin/master-data?tab=brands",
    },
    {
      key: "lines",
      title: "Tạo dòng hàng dưới từng nhãn",
      detail: "Mọi sản phẩm bắt buộc thuộc một dòng.",
      done: c.lines > 0,
      href: "/admin/master-data?tab=brands",
    },
    {
      key: "collections",
      title: "Tạo bộ sưu tập dưới từng nhãn",
      detail: "Không bắt buộc — sản phẩm có thể không thuộc bộ sưu tập nào.",
      done: c.collections > 0,
      optional: true,
      href: "/admin/master-data?tab=brands",
    },
    {
      key: "materials",
      title: "Tạo tuổi vàng",
      detail: "Không bắt buộc — dùng làm bộ lọc ở trang xem.",
      done: c.materials > 0,
      optional: true,
      href: "/admin/master-data?tab=materials",
    },
    {
      key: "excel",
      title: "Tải file mẫu Excel rồi nhập sản phẩm và số lượng",
      detail:
        "Mục Nhập Excel (sẽ có ở bước sau): file mẫu có sẵn danh sách chọn theo các danh mục vừa tạo.",
      done: false,
    },
  ];
}

/** Đã đủ các bước bắt buộc trước khi nhập Excel chưa. */
export function isSetupComplete(c: MasterDataCounts): boolean {
  return getSetupSteps(c)
    .filter((s) => s.key !== "excel" && !s.optional)
    .every((s) => s.done);
}
