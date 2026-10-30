# ADR-008 — Quy tắc dữ liệu sản phẩm, ảnh, danh mục, nhập file, phạm vi

- **Trạng thái:** ✅ Đã chốt (2026-10-30)
- **Nguồn:** Q-11, Q-16, Q-17, Q-23, R5b, R6, câu hỏi bổ sung về sửa mã, ẩn theo, chất liệu

## Sản phẩm
| # | Quy tắc |
|---|---------|
| P1 | Mã SP **không được sửa** sau khi tạo. Nhập sai → ẩn SP và tạo SP mới |
| P2 | Không xóa SP, **chỉ ẩn / hiện lại** (Q-23) |
| P3 | Mỗi SP **1 ảnh**; tên file ảnh = mã SP (VD `NTT001.jpg`). Tải ảnh mới cùng mã → **thay ảnh cũ** (Q-11) |
| P4 | Trường bắt buộc khi tạo SP: Mã, Nhãn, Dòng. Trường tùy chọn: Tên, Chất liệu, Giá, BST — thiếu thì hiển thị "—" *(mặc định kỹ thuật)* |
| P5 | Giá: số nguyên VND ≥ 0, một giá cho mỗi SP (không theo cửa hàng) |

## Danh mục phân loại
| # | Quy tắc |
|---|---------|
| M1 | **Chất liệu / tuổi vàng** là **danh mục cố định** do quản trị quản lý (như Nhãn hàng), dùng làm bộ lọc. Không thuộc nhãn |
| M2 | **Ẩn** Nhãn / Dòng / BST / Chất liệu → **các SP thuộc nó cũng bị ẩn** khỏi trang xem; hiện lại → SP hiện lại (trừ SP đã bị ẩn riêng) |
| M3 | Không xóa giá trị đang có SP tham chiếu (chỉ ẩn) |
| M4 | Tên Dòng / BST duy nhất trong cùng nhãn; tên Nhãn, Chất liệu duy nhất *(mặc định kỹ thuật)* |
| M5 | Không đổi nhãn của Dòng/BST đã có SP *(mặc định kỹ thuật — giữ ràng buộc cùng nhãn)* |

## Nhập file Excel
| # | Quy tắc |
|---|---------|
| R5 | Cửa hàng, Nhãn, Dòng, BST, Chất liệu **chưa tồn tại** → **báo lỗi**, không tự tạo. SP mới → được tạo |
| R6 | Ô **để trống** = **giữ nguyên** giá trị hiện có (muốn về 0 thì gõ 0) |
| R8 | Cặp (SP, cửa hàng) không có trong file → giữ nguyên |
| R10 | Sheet `SanPham` có thêm cột: Tên SP, Chất liệu, Giá |

## Phạm vi
| # | Quyết định |
|---|-----------|
| S1 | **Chỉ một mùa** (Xuân Thần Tài này) — không có thực thể Mùa (Q-16) |
| S2 | **Không lưu lịch sử thay đổi** (Q-17) → bỏ F09 |
