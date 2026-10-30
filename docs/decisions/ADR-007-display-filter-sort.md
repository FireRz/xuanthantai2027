# ADR-007 — Hiển thị, Bộ lọc, Sắp xếp, Tìm kiếm, Xuất Excel

- **Trạng thái:** ✅ Đã chốt (2026-10-30)
- **Nguồn:** Q-03, Q-07, Q-10, Q-13, Q-14, Q-15, Q-18, Q-19, câu hỏi bổ sung về giá, sắp xếp, bộ lọc

## Thông tin hiển thị trên mỗi sản phẩm
| Trường | Ghi chú |
|--------|---------|
| Ảnh | 1 ảnh (ADR-008) |
| Mã SP | |
| Tên SP | Q-10 |
| Chất liệu / tuổi vàng | Q-10; lấy từ danh mục cố định (ADR-008) |
| Giá bán lẻ (VND) | Q-10; **công khai được** (chủ dự án xác nhận) |
| SL đặt, SL đã về | Tổng hoặc theo cửa hàng đang lọc |
| **Còn thiếu** | Q-03 |
| **Tỷ lệ về (%)** | Q-03 |

## Công thức (Q-03, Q-07)
**Theo một cửa hàng:**
- Còn thiếu = `max(Đặt − Về, 0)`
- Tỷ lệ về = `min(Về / Đặt, 100%)`; nếu Đặt = 0 → hiển thị "—"

**Tổng hệ thống — tính trên số tổng** (chủ dự án chọn; hàng dư ở cửa hàng này bù cho cửa hàng khác):
- Tổng Đặt = Σ Đặt; Tổng Về = Σ Về
- Còn thiếu tổng = `max(Tổng Đặt − Tổng Về, 0)`
- Tỷ lệ về tổng = `min(Tổng Về / Tổng Đặt, 100%)`; Tổng Đặt = 0 → "—"

> Ví dụ: CH A đặt 5 về 7, CH B đặt 5 về 3 → Thiếu A = 0, Thiếu B = 2, **Thiếu tổng = 0**, Tỷ lệ tổng = 100%.

**SL về > SL đặt (Q-07):** cho phép nhập, không cảnh báo chặn; còn thiếu hiển thị 0, tỷ lệ tối đa 100%.

## Xem chi tiết (Q-15)
- **Cửa sổ nổi (popup)** trên trang danh mục, không chuyển trang.
- Nội dung: ảnh lớn, mã, tên, chất liệu, giá, nhãn, dòng, BST, bảng SL theo từng cửa hàng (Đặt, Về, Thiếu, Tỷ lệ) + dòng tổng.
- Mã SP đang mở được ghi lên URL (`?sp=MA`) để gửi link và để nút Back của điện thoại đóng popup (quyết định kỹ thuật).

## Bộ lọc
| Bộ lọc | Chọn | Ghi chú |
|--------|------|---------|
| Nhãn hàng | **Nhiều** | |
| Dòng hàng | **Nhiều** | Liên động theo nhãn đang chọn |
| Bộ sưu tập | **Nhiều** | Liên động theo nhãn; có lựa chọn **"Không thuộc BST"** |
| Chất liệu | **Nhiều** | **Mới** (vì chất liệu là danh mục cố định) |
| Cửa hàng | **Một** | Mặc định chỉ SP có đặt > 0, công tắc "Xem tất cả SP" (ADR-002 D6) |

- Trong một bộ lọc: các giá trị kết hợp **HOẶC**; giữa các bộ lọc: **VÀ** (hệ quả trực tiếp của chọn nhiều: một SP chỉ có một giá trị mỗi chiều).
- **Hiển thị số SP** cạnh mỗi lựa chọn, tính theo các bộ lọc khác đang áp dụng.
- Bộ lọc Cửa hàng chọn **một** vì số liệu hiển thị là số của đúng một cửa hàng (quyết định kỹ thuật).

## Tìm kiếm (Q-14)
- Ô tìm **theo mã SP** (chứa chuỗi, không phân biệt hoa/thường), kết hợp được với bộ lọc.

## Sắp xếp (người xem tự chọn)
1. **Mã SP A→Z** — *mặc định*
2. Mới cập nhật trước
3. Giá thấp → cao / cao → thấp
4. Còn thiếu nhiều nhất (theo phạm vi đang xem: tổng hoặc cửa hàng)

SP chưa có giá xếp cuối khi sắp theo giá.

## Xuất Excel (Q-18)
- **Người xem:** xuất danh sách **đang lọc/sắp xếp** (các cột đang hiển thị, theo phạm vi tổng hoặc cửa hàng).
- **Quản trị:** xuất **toàn bộ dữ liệu theo đúng mẫu nhập** (2 sheet) để sửa rồi nhập lại.

## Người dùng & thiết bị
- Cửa hàng **chỉ xem** (Q-13).
- Thiết kế tốt cho **cả điện thoại và máy tính** (Q-19); kiểm thử trên cả hai.
