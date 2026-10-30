# ADR-006 — Nhập dữ liệu bằng Excel & Tải ảnh sản phẩm

- **Trạng thái:** ✅ Đã chốt (2026-10-30) — chủ dự án đồng ý phương án ảnh tải riêng và sheet số lượng dạng "mỗi cửa hàng 1 dòng" (Q-27)
- **Nguồn:** Câu trả lời Q-08 ("File Excel, nhập file"; chưa có file mẫu) và yêu cầu "cần chỗ để up hình ảnh sản phẩm — Excel được không?"

## Bối cảnh
- Dữ liệu sẽ được quản lý bằng Excel và cập nhật lên web bằng cách tải file lên.
- Chưa có mẫu file → hệ thống sẽ **thiết kế mẫu mới**.
- Cần cách đưa ảnh sản phẩm lên web.

## Về việc chèn ảnh trực tiếp vào Excel
Về kỹ thuật **có thể** đọc ảnh chèn trong Excel, nhưng **không khuyến nghị**:
- Ảnh trong Excel "nổi" trên lưới ô, không gắn chắc với dòng → dễ gán nhầm ảnh cho sản phẩm khi chèn/xóa/sắp xếp dòng.
- Tính năng "ảnh trong ô" chỉ có ở một số phiên bản Excel; file tạo ở phiên bản khác có thể không đọc được.
- File phình rất to (hàng trăm ảnh) → tải lên chậm, dễ lỗi; Excel thường nén giảm chất lượng ảnh — bất lợi với trang sức.

## Đề xuất
1. **Excel chỉ chứa dữ liệu** (mẫu do hệ thống cung cấp, tải về từ trang quản trị).
2. **Ảnh tải lên riêng** trong trang quản trị, **kéo thả nhiều ảnh (hoặc 1 file .zip, giải nén ngay trên trình duyệt) cùng lúc**, **tên file = mã sản phẩm**:
   - `NTT001.jpg` → ảnh của SP `NTT001` (mỗi SP **1 ảnh** — ADR-008 P3; tải lại cùng mã = thay ảnh)
   - Ảnh được thu nhỏ trên trình duyệt rồi tải thẳng lên Vercel Blob (ADR-005).
   - Hệ thống báo cáo ảnh nào không khớp mã SP nào, SP nào chưa có ảnh.
3. Ngoài ra vẫn có thể tải/đổi ảnh cho từng SP trong form sửa sản phẩm.

## Mẫu Excel đề xuất (2 sheet)
**Sheet `SanPham`** — một dòng mỗi sản phẩm
| Mã SP | Tên SP | Nhãn hàng | Dòng hàng | Bộ sưu tập | Chất liệu | Giá bán lẻ |
|-------|--------|-----------|-----------|------------|-----------|-----------|
| NTT001 | … | … | … | *(trống = không đổi; SP mới để trống = không thuộc BST)* | … | 12500000 |

**Sheet `SoLuong`** — một dòng mỗi cặp (sản phẩm, cửa hàng)
| Mã SP | Mã cửa hàng | SL đặt | SL đã về |
|-------|-------------|--------|----------|

✅ Đã chọn dạng "một dòng mỗi cửa hàng": thêm/bớt cửa hàng không phải đổi mẫu, dễ kiểm tra lỗi.

## Quy tắc tạo mới khi nhập file (✅ chốt — chi tiết ADR-008)
- **Sản phẩm** mới → được tạo từ file.
- **Cửa hàng, Nhãn, Dòng, BST, Chất liệu** chưa có → **báo lỗi**, phải tạo trên web trước.
- Ô trống → giữ nguyên giá trị hiện có.

## Ảnh: định dạng chấp nhận
JPG, PNG, WEBP; sau khi thu nhỏ trên trình duyệt lưu dạng WEBP *(mặc định kỹ thuật)*.

Không còn câu hỏi mở.
