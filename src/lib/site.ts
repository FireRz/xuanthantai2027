/** Thông tin chi nhánh và người liên hệ hiện trên trang danh mục — đổi người/chi nhánh chỉ sửa ở đây. */

/** Tên chi nhánh đầy đủ (dòng dưới banner). */
export const BRANCH_FULL = "CN PNJ Miền Tây";
/** Tên chi nhánh ngắn (chân trang, tiêu đề tab). */
export const BRANCH_SHORT = "CN Miền Tây";

export const CONTACT = {
  name: "Phạm Hải Anh",
  /** Email đăng nhập Teams; để trống thì chỉ hiện tên, không có nút mở chat. */
  teamsEmail: "anh.ph08@pnj.com.vn",
};

/** Link mở thẳng cửa sổ chat Teams với một người (theo email đăng nhập Teams). */
export function teamsChatUrl(email: string): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`;
}
