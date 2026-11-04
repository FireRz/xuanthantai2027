/** Chiều nhóm của trang phân tích: `?nhom=brand|line|col|mat|typ|pr|store`. */
export const GROUP_DIMS = ["brand", "line", "col", "mat", "typ", "pr", "store"] as const;
export type GroupDim = (typeof GROUP_DIMS)[number];

/** Giá trị lạ hoặc thiếu → "brand"; tham số lặp lấy giá trị đầu. */
export function parseGroupDim(raw: string | string[] | undefined): GroupDim {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return GROUP_DIMS.includes(v as GroupDim) ? (v as GroupDim) : "brand";
}
