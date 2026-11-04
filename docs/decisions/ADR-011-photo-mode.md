# ADR-011 — Chế độ "Chỉ xem hình"

- **Trạng thái:** Đã chốt (2026-11-04)
- **Nguồn:** Yêu cầu của chủ dự án: một số người chỉ muốn xem hình và thông tin sản phẩm, không cần số lượng đặt - về - bán.

## Quyết định
| # | Nội dung |
|---|----------|
| P1 | Tham số URL `?xem=hinh` bật chế độ; mọi giá trị khác hoặc không có = chế độ đầy đủ. Không bao giờ ném lỗi. |
| P2 | **Vẫn hiện:** ảnh, mã SP, tên, nhãn, dòng, BST, tuổi vàng, chủng loại, giá. Thanh cửa hàng và ô tìm mã giữ nguyên. |
| P3 | **Ẩn:** thanh tiến độ "Về X/Y", "Còn thiếu", "Bán · Tồn · %", nhãn trạng thái, các cột số lượng ở dạng Bảng, khung tóm tắt + bảng theo cửa hàng ở popup, nút "Xuất Excel", và 2 kiểu sắp xếp `shortage`, `sold` (rơi về Mã A→Z). |
| P4 | Mọi liên kết dựng từ `buildCatalogQuery` nên chế độ tự đi theo khi lọc, tìm, mở popup, "Xem thêm". |

## Lý do không dùng đăng nhập / vai trò
- Trang xem vẫn **công khai** (ADR-004 A1). Đây là tiện ích hiển thị, không phải phân quyền.
- Ai bỏ tham số `xem=hinh` khỏi URL vẫn thấy số lượng — chấp nhận được vì dữ liệu này vốn đã công khai theo A1 và đây không phải cơ chế bảo mật.

## Hệ quả
- `CatalogParams.photo: boolean`; `PHOTO_HIDDEN_SORTS` liệt kê các kiểu sắp xếp bị ẩn.
- Các thành phần hiển thị số lượng nhận cờ `photo` và không render phần số liệu.
