# ADR-010 — Khung giá

- **Trạng thái:** ✅ Đã chốt (2026-11-02, chủ dự án xác nhận trong phiên 4)
- **Nguồn:** yêu cầu thêm bộ lọc Khung giá ở phiên 4.

## Quyết định
| # | Nội dung |
|---|----------|
| K1 | **Khung giá là danh mục** (như Chất liệu), do quản trị tạo; chủ dự án **nhập sẵn khung giá của từng SP trong file Excel** — không tự tính từ giá bán. |
| K2 | Mỗi SP có **tối đa một** khung giá (có thể trống). Khung giá độc lập với `price_vnd`. |
| K3 | Tên duy nhất (không phân biệt hoa/thường). Có **thứ tự hiển thị** `sort_order` (theo khoảng giá, không theo chữ cái); khung mới thêm vào cuối. |
| K4 | Ẩn khung giá → SP thuộc khung ẩn theo (như chất liệu, ADR-008 M2), có báo số SP bị ảnh hưởng và xác nhận. Đang có SP dùng thì không xóa được, chỉ ẩn. |
| K5 | Bộ lọc **chọn nhiều** (HOẶC trong bộ lọc, VÀ với bộ lọc khác), có số đếm; trên máy tính là **hàng chip** dưới hàng Nhãn hàng, trên điện thoại là nhóm chip trong bảng lọc. Tham số URL `pr=id,id`. |
| K6 | **SP chưa có khung giá bị ẩn khi đang lọc Khung giá** (không có lựa chọn "Chưa có khung giá"). |
| K7 | Excel (sheet SanPham) có cột **Khung giá** với danh sách chọn; tên khung giá chưa có trong danh mục → lỗi, như chất liệu (R-quy tắc F08). *Việc thêm cột nằm ở T08.3/T08.5/T08.7 và T11.4.* |

## 13 khung giá ban đầu (theo thứ tự)
`< 1tr` · `1tr < 1.5tr` · `1.5tr < 2tr` · `2tr < 5tr` · `5tr < 7tr` · `7tr < 10tr` · `10tr < 15tr` · `15tr < 20tr` · `20tr < 30tr` · `30tr < 50tr` · `50tr < 70tr` · `70tr < 100tr` · `> 100tr`

## Chưa làm / cần theo dõi
- Đổi thứ tự khung giá trên trang quản trị (hiện chỉ theo thứ tự thêm).
- Form SP (T07.5) và Excel (F08, F11) cần thêm trường Khung giá.
- Khung giá trên môi trường thật cần nhập qua trang quản trị trước khi nhập Excel (thêm vào hướng dẫn thứ tự nhập, T06.6).
