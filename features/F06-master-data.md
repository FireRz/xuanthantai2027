# F06 — Quản lý Nhãn / Dòng / Bộ sưu tập / Chất liệu / Cửa hàng

**Ưu tiên:** Must · **Milestone:** M3 · **Quyết định:** ADR-002 (D7), ADR-003, ADR-008 ✅

## Mục tiêu
Quản trị tạo và duy trì các danh mục — nguồn cho bộ lọc (F04), phân loại SP (F07), danh sách chọn trong mẫu Excel (F08).

## Phạm vi & quy tắc
| Danh mục | Trường | Quy tắc |
|----------|--------|---------|
| Nhãn hàng | Tên | Tên duy nhất |
| Dòng hàng | Nhãn, Tên | Bắt buộc thuộc 1 nhãn; tên duy nhất trong nhãn |
| Bộ sưu tập | Nhãn, Tên | Bắt buộc thuộc 1 nhãn; tên duy nhất trong nhãn |
| Chất liệu / tuổi vàng | Tên | Tên duy nhất; không thuộc nhãn |
| Cửa hàng | Mã, Tên | Mã duy nhất; quản trị tự nhập (Q-25) |

Chung cho mọi danh mục:
- Thêm, sửa tên, **ẩn/hiện**; **không xóa** khi đang có SP/SL tham chiếu (ADR-008 M3); xóa được nếu chưa có tham chiếu *(mặc định kỹ thuật — sửa lỗi gõ nhầm)*.
- **Ẩn Nhãn/Dòng/BST/Chất liệu → SP thuộc nó ẩn theo** trên trang xem (ADR-008 M2). Hiện lại → SP hiện lại.
- Ẩn cửa hàng → không có trong bộ lọc, bảng chi tiết và không cộng vào tổng.
- Không đổi nhãn của Dòng/BST đã có SP.
- Trước khi ẩn: hiển thị số SP sẽ bị ẩn theo, yêu cầu xác nhận.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T06.1 | Service Nhãn / Dòng / BST (ràng buộc nhãn, tên duy nhất, chặn đổi nhãn khi có SP) | T01.6, T02.4 | Unit: tạo Dòng không nhãn → lỗi; trùng tên trong nhãn → lỗi; khác nhãn → OK |
| T06.2 | Service Chất liệu | T01.6, T02.4 | Unit: trùng tên → lỗi |
| T06.3 | Service Cửa hàng (mã duy nhất) | T01.6, T02.4 | Unit: trùng mã → lỗi |
| T06.4 | Ẩn/hiện + xóa có điều kiện cho cả 5 danh mục; đếm SP bị ảnh hưởng | T06.1, T06.2, T06.3 | Integration: ẩn nhãn có 10 SP → trang xem mất 10 SP; hiện lại → trở lại |
| T06.5 | Trang `/admin/master-data`: tab Nhãn (dạng cây Nhãn → Dòng/BST), Chất liệu, Cửa hàng | T06.4, T02.3 | E2E: thêm BST dưới nhãn A → bộ lọc trang xem có BST đó khi chọn A |
| T06.6 | Trạng thái rỗng & hướng dẫn thứ tự: tạo danh mục, cửa hàng → tải mẫu Excel | T06.5 | E2E: DB trống → thấy hướng dẫn |

## Tiêu chí nghiệm thu
- **AC1.** Không thể tạo Dòng/BST mà không chọn nhãn; không trùng tên trong cùng nhãn.
- **AC2.** Giá trị mới xuất hiện trong bộ lọc (khi có SP) và trong danh sách chọn của mẫu Excel.
- **AC3.** Đổi tên phản ánh ngay trên trang xem, không mất liên kết SP.
- **AC4.** Ẩn Nhãn/Dòng/BST/Chất liệu → SP thuộc nó biến mất khỏi trang xem; hiện lại → xuất hiện lại.
- **AC5.** Ẩn cửa hàng → biến mất khỏi bộ lọc, bảng chi tiết, và tổng không còn cộng số của CH đó.
- **AC6.** Không thể xóa giá trị đang được tham chiếu.
