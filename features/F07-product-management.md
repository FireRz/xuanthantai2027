# F07 — Quản lý sản phẩm & Hình ảnh

**Ưu tiên:** Must · **Milestone:** M3 · **Quyết định:** ADR-003, ADR-005, ADR-006, ADR-008 ✅

## Mục tiêu
Quản trị xem, sửa, ẩn/hiện sản phẩm trên web và **tải ảnh sản phẩm hàng loạt** (Yêu cầu 4). Tạo SP hàng loạt qua Excel: F08.

## Quy tắc (ADR-008)
- Mã SP duy nhất, **không sửa** sau khi tạo.
- Bắt buộc: Mã, Nhãn, Dòng. Tùy chọn: Tên, BST (cùng nhãn), Chất liệu, Giá (VND ≥ 0).
- **Không xóa**, chỉ ẩn/hiện.
- **1 ảnh/SP**, tên file = mã SP; tải lại = thay ảnh cũ (ảnh cũ xóa khỏi Blob).
- Ảnh JPG/PNG/WEBP; thu nhỏ trên trình duyệt (~1600px + ~400px, WEBP) rồi tải thẳng lên Vercel Blob.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T07.1 | Schema Zod sản phẩm (dùng chung form + import) | T01.5 | Unit: thiếu mã/nhãn/dòng → lỗi; giá âm → lỗi; BST trống hợp lệ |
| T07.2 | Service `product.create/update/setActive` + ràng buộc cùng nhãn, không sửa mã | T01.6, T02.4, T07.1 | Integration: dòng khác nhãn → lỗi; gửi mã mới khi update → bị bỏ qua/lỗi |
| T07.3 | `lib/image-resize.ts` (trình duyệt) + `/api/blob-upload` (token chỉ cho admin) + service gắn/thay ảnh | T01.9, T02.4 | Unit resize; integration: thay ảnh → URL mới, file cũ bị xóa |
| T07.4 | Trang `/admin/products`: bảng (thumbnail, mã, tên, nhãn, dòng, BST, chất liệu, giá, trạng thái), tìm mã, lọc, phân trang | T07.2, T02.3 | E2E: tìm mã → đúng SP |
| T07.5 | Form thêm/sửa SP: chọn nhãn → dòng/BST lọc theo nhãn; "Không thuộc BST"; mã chỉ đọc khi sửa | T07.2, T06.1, T06.2 | E2E: thêm SP → xuất hiện ở trang xem |
| T07.6 | Đổi ảnh trong form | T07.3, T07.5 | E2E: đổi ảnh → thẻ danh mục đổi theo |
| T07.7 | Ẩn/hiện SP (đơn lẻ + nhiều SP cùng lúc) | T07.2 | E2E: ẩn → mất khỏi trang xem, còn trong admin |
| T07.8 | Trang `/admin/images`: chọn nhiều file / thư mục / .zip (giải nén trên trình duyệt) → đối chiếu tên với mã SP → xem trước (khớp / không khớp / trùng mã / SP chưa có ảnh) → xác nhận → thu nhỏ & tải song song có thanh tiến trình | T07.3, T02.3 | E2E: 10 ảnh, 2 tên sai → 8 gắn đúng, 2 báo không khớp |
| T07.9 | Bộ lọc "SP chưa có ảnh" trong `/admin/products` + hướng dẫn đặt tên ảnh | T07.4, T07.8 | E2E |

## Tiêu chí nghiệm thu
- **AC1.** Quản trị thêm SP đủ trường bắt buộc → SP hiển thị trên trang xem và đúng kết quả lọc.
- **AC2.** Không tạo được SP trùng mã; không sửa được mã SP đã tạo.
- **AC3.** Không gán được Dòng/BST thuộc nhãn khác nhãn của SP.
- **AC4.** Tải một lần nhiều ảnh (hoặc .zip) đặt tên theo mã → mỗi ảnh gắn đúng SP; ảnh không khớp được liệt kê, không gắn nhầm.
- **AC5.** Tải ảnh mới cho SP đã có ảnh → ảnh mới thay thế ảnh cũ.
- **AC6.** File không phải ảnh bị từ chối có thông báo.
- **AC7.** SP bị ẩn không xuất hiện ở trang xem và không được đếm trong bộ lọc.

> **Khung giá (ADR-010):** form SP (T07.5) cần thêm trường Khung giá (chọn từ danh mục, có thể trống).
