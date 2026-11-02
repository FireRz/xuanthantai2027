# F11 — Xuất Excel

**Ưu tiên:** Must · **Milestone:** M2 (người xem) + M3 (quản trị) · **Quyết định:** ADR-007 (Q-18: "Cả hai") ✅

## Mục tiêu
- **Người xem** tải về danh sách đang lọc (VD cửa hàng tải danh sách hàng của mình).
- **Quản trị** tải toàn bộ dữ liệu hiện tại theo đúng mẫu nhập để sửa rồi nhập lại.

## Phạm vi
### Người xem
- Nút "Xuất Excel" trên trang danh mục; dùng **cùng tham số** lọc/tìm/sắp xếp/cửa hàng/công tắc như đang xem.
- Cột: Mã SP, Tên, Nhãn, Dòng, BST, Chất liệu, Giá, SL đặt, SL đã về, Còn thiếu, Tỷ lệ về; tiêu đề ghi phạm vi (Tổng hệ thống / Cửa hàng X) và thời điểm xuất.
- Không kèm ảnh; có thể kèm cột link ảnh *(mặc định kỹ thuật)*.
- Không cần đăng nhập (trang xem công khai).

### Quản trị
- `/admin/export`: file đúng mẫu nhập (`SanPham`, `SoLuong`, `HuongDan`) gồm các SP đang hoạt động *(mặc định kỹ thuật; SP ẩn không xuất, nhập lại không ảnh hưởng chúng vì R8)* và mọi cặp (SP, CH) có số liệu.
- File xuất nhập lại được ngay, không lỗi, không tạo thay đổi.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T11.1 | ✅ Service `export.viewerList(params)` dùng lại `catalog.listProducts` (không phân trang) | T04.3 | Integration: số dòng = số kết quả trên trang |
| T11.2 | ✅ Route `GET /api/export` → .xlsx (ExcelJS, stream) | T11.1 | E2E: tải file, mở được, đúng cột & dữ liệu |
| T11.3 | Nút "Xuất Excel" trên danh mục (desktop + mobile) | T11.2, T04.9 | E2E: lọc CH X → file chỉ chứa phạm vi X |
| T11.4 | Service `export.adminTemplate()` dùng `lib/excel-template.ts` | T08.3, T01.6 | Integration: xuất → import preview → 0 thay đổi, 0 lỗi |
| T11.5 | Trang `/admin/export` | T11.4, T02.3 | E2E |
| T11.6 | Đo thời gian xuất với seed lớn | T11.2, T11.4, T01.11 | Xuất ≤ 20s với 3.000 SP × 100 CH |

## Tiêu chí nghiệm thu
- **AC1.** File người xem chứa đúng các SP và số liệu đang hiển thị (cùng bộ lọc, tìm kiếm, sắp xếp, phạm vi cửa hàng).
- **AC2.** File ghi rõ phạm vi số liệu và thời điểm xuất.
- **AC3.** File quản trị nhập lại ngay qua F08 không có lỗi và không tạo thay đổi.
- **AC4.** Hoạt động trên điện thoại (tải file về máy) và máy tính.
