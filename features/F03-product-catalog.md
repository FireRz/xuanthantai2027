# F03 — Danh mục sản phẩm (xem công khai)

**Ưu tiên:** Must · **Milestone:** M2 · **Quyết định:** ADR-002, ADR-004, ADR-007, ADR-009 ✅ · **Giao diện:** [UI-DESIGN §5.1–5.4](../docs/UI-DESIGN.md), mockup đã duyệt (T00.3)

## Mục tiêu
Cửa hàng xem danh sách sản phẩm mùa Xuân Thần Tài với ảnh, mã, tên, chất liệu, giá, SL đặt, SL đã về, còn thiếu, tỷ lệ về (Yêu cầu 1, 2; Q-03, Q-10).

## Phạm vi
- Trang web cuộn: banner Tết → khu Bộ sưu tập → Tất cả sản phẩm → chân trang (ADR-009 U4'–U16).
- Lưới SP (thẻ gọn, ảnh to): ảnh, mã · chất liệu, tên, giá, thanh tiến độ "Về X/Y", "Còn thiếu N", nhãn trạng thái. Dạng Bảng và popup hiện đủ SL đặt, về, thiếu, tỷ lệ.
- Phạm vi số liệu: không lọc cửa hàng → **tổng hệ thống** (tính trên số tổng); lọc cửa hàng → **số của cửa hàng đó**. Thẻ ghi rõ phạm vi.
- **Nhãn trạng thái** màu: Đủ hàng / Còn thiếu / Chưa về / Không đặt (UI-DESIGN §4).
- **Chuyển Lưới / Bảng**, mặc định Lưới (ĐT 2 cột, tablet 3, máy tính 4); lưu `view` trên URL.
- Header đỏ với logo trắng, tiêu đề "Xuân Thần Tài 2027", họa tiết Tết nhẹ.
- Trường thiếu (tên, giá, chất liệu, ảnh) hiển thị "—" / ảnh thay thế.
- Phân trang / tải thêm; trạng thái rỗng, lỗi, đang tải.
- Thiết kế tốt cho điện thoại và máy tính.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T03.1 | Service `catalog.listProducts(params)`: SP visible, kèm số liệu theo phạm vi (dùng `product_totals` / SL cửa hàng + `metrics`) | T01.6, T01.7 | Integration: số liệu khớp công thức; SP ẩn không trả về |
| T03.2 | `ProductCard`: thumbnail, mã, tên, chất liệu, giá định dạng VND, 4 chỉ số SL; "—" khi thiếu | T01.1 | Component test: đủ trường; tỷ lệ null → "—"; giá 12500000 → "12.500.000 ₫" |
| T03.3 | `ProductGrid` responsive (2 cột điện thoại → 4–5 cột desktop) | T03.2 | E2E 375px / 1280px không vỡ, không cuộn ngang |
| T03.4 | Trang `/` công khai (SSR) | T03.1, T03.3 | E2E: thấy SP seed |
| T03.5 | Phân trang / tải thêm | T03.4 | E2E: không trùng, không sót SP giữa các trang |
| T03.6 | Trạng thái rỗng / lỗi / skeleton | T03.4 | E2E: DB rỗng → thông báo |
| T03.7 | Ảnh: dùng thumbnail, lazy-load, ảnh thay thế | T03.2 | Không tải ảnh lớn ở danh mục (kiểm tra network) |
| T03.8 | Nhãn phạm vi trên thẻ/đầu trang: "Tổng hệ thống" / "Cửa hàng X" | T03.2, T04.5 | E2E: chọn CH → nhãn đổi |
| T03.9 | Design tokens (Tailwind theme), font, layout gốc + header (logo, tiêu đề, họa tiết) | T01.1, T00.3 | So khớp mockup; kiểm tra tương phản AA |
| T03.10 | `lib/status.ts` + `StatusBadge` (4 trạng thái) | T01.7 | Unit: bảng điều kiện UI-DESIGN §4 |
| T03.11 | Dạng Bảng (`ProductTable`) + nút chuyển Lưới/Bảng, `view` trên URL | T03.4, T03.10 | E2E: chuyển → cùng dữ liệu, giữ bộ lọc; điện thoại không cuộn ngang cả trang |
| T03.12 | Banner Tết (ảnh trang trí do chủ dự án cung cấp, nút "Chọn cửa hàng của bạn ↓") + **thanh "Cửa hàng của bạn" dưới banner, dính khi cuộn** (ô chọn cửa hàng + tìm mã) | T03.9, T04.2, ảnh trong `docs/brand/` | E2E: thanh cửa hàng luôn thấy khi cuộn; chọn cửa hàng → số liệu theo cửa hàng |
| T03.13 | Khu "Bộ sưu tập mùa này": service đếm SP theo BST, thẻ BST (ảnh = SP đầu tiên theo mã), thẻ "Ngoài bộ sưu tập"; bấm → lọc BST, cuộn tới danh sách, dải "Đang xem bộ sưu tập" | T03.1, T04.9 | E2E: bấm thẻ BST → danh sách chỉ còn SP của BST đó |
| T03.14 | Chân trang (thời điểm cập nhật dữ liệu gần nhất) | T03.9 | Hiển thị đúng thời điểm import/sửa gần nhất |

## Tiêu chí nghiệm thu
- **AC1.** Người xem (không đăng nhập) mở danh mục thấy mỗi SP với ảnh, mã, tên, chất liệu, giá, SL đặt, SL đã về, còn thiếu, tỷ lệ về.
- **AC2.** Không lọc cửa hàng: SL là tổng các cửa hàng; còn thiếu = max(ΣĐặt − ΣVề, 0); tỷ lệ = min(ΣVề/ΣĐặt, 100%), ΣĐặt = 0 → "—".
- **AC3.** Người xem luôn biết số đang hiển thị là tổng hay của cửa hàng nào.
- **AC4.** SP thiếu ảnh/giá/tên/chất liệu hiển thị bình thường với "—" hoặc ảnh thay thế.
- **AC5.** Dùng tốt trên màn hình 375px và 1280px.
- **AC6.** Đạt mục tiêu hiệu năng ARCHITECTURE §7 với seed quy mô lớn.
- **AC7.** Mỗi SP có nhãn trạng thái đúng điều kiện UI-DESIGN §4 theo phạm vi đang xem.
- **AC8.** Chuyển Lưới ↔ Bảng giữ nguyên bộ lọc, tìm kiếm, sắp xếp; mặc định là Lưới.
- **AC9.** Giao diện khớp mockup đã duyệt (màu, font, header, thẻ).
