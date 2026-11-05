/** Chiều nhóm của trang phân tích: `?nhom=brand|line|col|mat|typ|pr|kv|store`. */
export const GROUP_DIMS = ["brand", "line", "col", "mat", "typ", "pr", "kv", "store"] as const;
export type GroupDim = (typeof GROUP_DIMS)[number];

/** Giá trị lạ hoặc thiếu → "brand"; tham số lặp lấy giá trị đầu. */
export function parseGroupDim(raw: string | string[] | undefined): GroupDim {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return GROUP_DIMS.includes(v as GroupDim) ? (v as GroupDim) : "brand";
}

/** Tên chiều nhóm trên nút chọn và tiêu đề cột Tên của bảng so sánh. */
export const GROUP_DIM_LABELS: Record<GroupDim, string> = {
  brand: "Nhãn",
  line: "Dòng",
  col: "BST",
  mat: "Tuổi vàng",
  typ: "Chủng loại",
  pr: "Khung giá",
  kv: "Khu vực",
  store: "Cửa hàng",
};
