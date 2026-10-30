# ADR-004 — Truy cập & Phân quyền

- **Trạng thái:** Đã chốt (2026-10-30)
- **Nguồn:** Câu trả lời cho Q-05, Q-06

## Quyết định
| # | Nội dung |
|---|----------|
| A1 | **Trang xem công khai**, không cần đăng nhập. Ai có link đều xem được ảnh, mã SP, số lượng tổng và theo cửa hàng. |
| A2 | **Chỉ một người (chủ dự án) cập nhật dữ liệu.** Có duy nhất vai trò ADMIN. |
| A3 | Khu vực `/admin/*` và mọi API ghi bắt buộc đăng nhập ADMIN. |

## Hệ quả
- Không cần chức năng quản lý nhiều người dùng / phân quyền theo cửa hàng (bỏ 2 task quản lý người dùng và phân quyền theo cửa hàng của bản kế hoạch đầu; số hiệu T02.5/T02.6 nay dùng cho script mật khẩu và trang đổi mật khẩu).
- Tài khoản ADMIN tạo bằng biến môi trường/script khi triển khai; cho phép đổi mật khẩu.
- Phương thức: đăng nhập bằng tài khoản + mật khẩu (Auth.js Credentials), mật khẩu băm, giới hạn số lần sai.
- Optimistic locking và audit log trở nên ít cấp thiết (chỉ 1 người ghi) → F09 giữ mức Could.

## Rủi ro đã được chấp nhận
- Dữ liệu số lượng và hình ảnh sản phẩm **có thể bị người ngoài hệ thống xem** nếu link bị chia sẻ, và có thể bị công cụ tìm kiếm lập chỉ mục.
- Giảm thiểu đề xuất (không thay đổi quyết định A1): đặt `noindex` / `robots.txt` chặn công cụ tìm kiếm; dùng tên miền/đường dẫn không công bố rộng.
- ✅ Chủ dự án đã chọn chặn công cụ tìm kiếm (Q-26, ADR-005 I6).
