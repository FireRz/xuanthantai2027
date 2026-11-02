# F05 — Chi tiết sản phẩm (cửa sổ nổi)

**Ưu tiên:** Must · **Milestone:** M2 · **Quyết định:** ADR-007 (Q-15: popup), ADR-009 ✅ · **Giao diện:** [UI-DESIGN §5.5](../docs/UI-DESIGN.md)

## Mục tiêu
Xem ảnh lớn và **số lượng của từng cửa hàng** cho một sản phẩm mà không rời trang danh mục.

## Phạm vi
- Bấm thẻ SP → cửa sổ nổi (desktop: modal giữa màn hình; điện thoại: toàn màn hình).
- Nội dung: ảnh lớn, mã, tên, chất liệu, giá, nhãn, dòng, BST (hoặc "Không thuộc BST").
- **Bảng SL theo cửa hàng**: Mã CH, Tên CH, Đặt, Về, Thiếu, Tỷ lệ, Trạng thái; dòng **Tổng** (tính trên số tổng). Chỉ cửa hàng đang hoạt động. Nếu đang lọc cửa hàng X → làm nổi dòng X.
- URL `?sp=MA` để gửi link; nút Back/Esc/bấm ngoài đóng popup.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T05.1 | ✅ Chốt hình thức popup | — | — |
| T05.2 | ✅ Service `catalog.getProductDetail(sku)` (SP visible + SL mọi CH active + tổng) | T01.6, T01.7 | Integration: SP ẩn → null; tổng = công thức |
| T05.3 | ✅ Component popup (modal / full-screen mobile), ảnh lớn | T05.2, T03.2 | E2E: bấm thẻ → popup đúng SP |
| T05.4 | ✅ Bảng SL theo cửa hàng + dòng tổng; làm nổi CH đang lọc; cuộn tốt khi 100 CH | T05.3 | E2E: tổng trong bảng = số trên thẻ (khi không lọc CH) |
| T05.5 | ✅ Đồng bộ `?sp=` với URL, Back/Esc đóng, giữ nguyên bộ lọc | T05.3, T04.9 | E2E: mở link có `?sp=` → popup mở sẵn; Back → đóng, bộ lọc còn |
| T05.6 | ✅ `sp` không tồn tại / bị ẩn → thông báo "Không tìm thấy sản phẩm" | T05.3 | E2E |

## Tiêu chí nghiệm thu
- **AC1.** Bấm một SP mở popup đúng SP đó, có ảnh lớn và đủ thông tin.
- **AC2.** Bảng liệt kê mọi cửa hàng đang hoạt động với Đặt, Về, Thiếu, Tỷ lệ; dòng tổng khớp số trên thẻ danh mục.
- **AC3.** Đóng popup (nút, Esc, Back, bấm ngoài) giữ nguyên bộ lọc và vị trí cuộn.
- **AC4.** Link có `?sp=MA` mở thẳng popup; mã không hợp lệ hiện thông báo không tìm thấy.
- **AC5.** Dùng tốt trên điện thoại (toàn màn hình) và máy tính.
