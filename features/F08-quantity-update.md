# F08 — Nhập Excel & Cập nhật số lượng

**Ưu tiên:** Must · **Milestone:** M3 · **Quyết định:** ADR-002, ADR-005, ADR-006, ADR-008 ✅

## Mục tiêu
Quản trị tạo/cập nhật sản phẩm và **SL đặt / SL đã về theo từng cửa hàng** bằng file Excel (Yêu cầu 4); sửa nhanh vài con số trên web.

## Mẫu Excel (ADR-006)
**Sheet `SanPham`:** Mã SP · Tên SP · Nhãn hàng · Dòng hàng · Bộ sưu tập · Chất liệu · Giá bán lẻ
**Sheet `SoLuong`:** Mã SP · Mã cửa hàng · SL đặt · SL đã về (mỗi cửa hàng 1 dòng)
**Sheet `HuongDan`:** giải thích cột và quy tắc.
Cột Nhãn/Dòng/BST/Chất liệu/Mã CH có **danh sách chọn** lấy từ dữ liệu hiện có.

## Quy tắc
| # | Quy tắc |
|---|---------|
| R1 | SL lưu theo (SP, cửa hàng); tổng tự tính |
| R3 | Giá trị trong file **ghi đè** giá trị hiện có |
| R4 | SL về > SL đặt: **cho phép**, không cảnh báo chặn |
| R5 | SP mới được tạo; Cửa hàng / Nhãn / Dòng / BST / Chất liệu chưa có → **lỗi** |
| R6 | Ô trống = **giữ nguyên** (SP mới: ô tùy chọn trống = để trống) |
| R8 | Cặp (SP, CH) không có trong file → giữ nguyên |
| R9 | Dòng, BST cùng nhãn với SP |
| R11 | Mã SP trong `SoLuong` phải có trong `SanPham` của file **hoặc** đã tồn tại trên web |
| R12 | Trùng (Mã SP) trong `SanPham` hoặc trùng (Mã SP, Mã CH) trong `SoLuong` → lỗi |
| R13 | Nhập file **không đổi nhãn** của SP đã có nếu việc đó làm dòng/BST lệch nhãn → lỗi theo R9 |
| R14 | Còn bất kỳ lỗi nào → **không cho áp dụng** (sửa file rồi tải lại) |
| R15 | So khớp tên danh mục không phân biệt hoa/thường và khoảng trắng thừa *(mặc định kỹ thuật)* |

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T08.1 | ✅ Chốt quy tắc nhập | — | — |
| T08.2 | Service `quantity.set(productId, storeId, {ordered?, received?})` — upsert ghi đè | T01.6, T02.4 | Unit: ghi đè; undefined = giữ nguyên; âm → lỗi |
| T08.3 | `lib/excel-template.ts`: định nghĩa sheet/cột dùng chung cho mẫu, import, export | T01.1 | Unit: tên cột, thứ tự |
| T08.4 | Trang `/admin/quantities`: chọn SP hoặc CH → bảng sửa inline, lưu theo lô | T08.2, T04.4 | E2E: sửa SL CH X của 3 SP → trang xem (lọc X) số mới, tổng cập nhật |
| T08.5 | Tạo file mẫu (danh sách chọn, sheet hướng dẫn) | T08.3, T06.1–T06.3 | Mở bằng Excel: danh sách chọn hoạt động; nhập lại mẫu trống không lỗi |
| T08.6 | Client upload file .xlsx lên Blob + bộ đọc ExcelJS → dòng chuẩn hóa (trim, số dạng text, ô trống = undefined) | T01.9, T08.3 | Unit: dòng trống bỏ qua; "1.000" / " 12 " đọc đúng |
| T08.7 | Validate & phân loại theo R5–R15: SP mới / SP thay đổi / dòng SL thay đổi / không đổi / lỗi (dòng, cột, lý do) | T08.6, T07.1, T06.1–T06.3 | Unit ma trận lỗi cho từng quy tắc |
| T08.8 | Màn hình xem trước: tổng hợp + bảng chi tiết cũ → mới, lọc theo loại; nút Áp dụng khóa khi có lỗi | T08.7 | E2E: file 2 dòng lỗi → đúng dòng & lý do, không áp dụng được |
| T08.9 | Áp dụng trong 1 transaction, ghi theo lô | T08.7, T08.2 | Integration: giả lập lỗi giữa chừng → không có thay đổi nào |
| T08.10 | Đo hiệu năng import với 3.000 SP + 100.000 dòng SL trên Vercel preview | T08.9, T01.11 | Đạt mục tiêu ARCHITECTURE §7; nếu không → tách lô có thể tiếp tục |

## Tiêu chí nghiệm thu
- **AC1.** Quản trị tải được file mẫu; danh sách chọn khớp dữ liệu trên web.
- **AC2.** SP A tại CH X đang Đặt = 10; nhập Đặt = 15 → Đặt = 15 (ghi đè), tổng của A tăng 5.
- **AC3.** Ô trống trong file không làm thay đổi giá trị hiện có.
- **AC4.** Trước khi áp dụng, thấy số SP mới / SP thay đổi / dòng SL thay đổi / lỗi, kèm giá trị cũ → mới.
- **AC5.** Mỗi lỗi chỉ rõ sheet, dòng, cột, lý do (VD: "SoLuong dòng 12: Mã cửa hàng 'CH99' chưa có trên web").
- **AC6.** Có lỗi → không áp dụng được; áp dụng là "tất cả hoặc không".
- **AC7.** Cửa hàng / Nhãn / Dòng / BST / Chất liệu chưa có → báo lỗi, không tự tạo.
- **AC8.** File xuất từ F11 (quản trị) nhập lại ngay không lỗi và không tạo thay đổi.
- **AC9.** Sửa nhanh trên web cho kết quả giống nhập file.

> **Khung giá (ADR-010):** sheet SanPham có thêm cột Khung giá (danh sách chọn); tên chưa có trong danh mục → lỗi như chất liệu. Ảnh hưởng T08.3, T08.5, T08.7 và xuất Excel T11.4.
