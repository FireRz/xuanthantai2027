# F04 — Bộ lọc, Tìm kiếm, Sắp xếp

**Ưu tiên:** Must · **Milestone:** M2 · **Quyết định:** ADR-002 (D6), ADR-003, ADR-007 ✅

## Mục tiêu
Lọc theo nhãn hàng, dòng hàng, bộ sưu tập (Yêu cầu 3), chất liệu và cửa hàng; tìm theo mã SP; người xem tự chọn cách sắp xếp.

## Quy tắc (ADR-007)
| # | Quy tắc |
|---|---------|
| B1 | Giữa các bộ lọc: VÀ; trong một bộ lọc: HOẶC |
| B2 | Nhãn, Dòng, BST, Chất liệu: **chọn nhiều**. Cửa hàng: **chọn một** |
| B3 | Liên động: Dòng và BST chỉ hiện giá trị thuộc các nhãn đang chọn; chọn BST → Dòng chỉ còn dòng có SP trong BST đó |
| B4 | **Hiển thị số SP** cạnh mỗi lựa chọn (tính theo các bộ lọc khác + tìm kiếm + phạm vi cửa hàng) |
| B5 | Tìm kiếm theo **mã SP**: chứa chuỗi, không phân biệt hoa/thường |
| B6 | BST có lựa chọn **"Không thuộc BST"** |
| B7 | Cửa hàng X: mặc định chỉ SP X có đặt > 0; công tắc **"Xem tất cả SP"** hiện mọi SP (số của X, không đặt = 0) |
| B8 | Sắp xếp: **Mã SP A→Z (mặc định)**, Mới cập nhật, Giá thấp→cao, Giá cao→thấp, Còn thiếu nhiều nhất (theo phạm vi). SP không giá xếp cuối khi sắp theo giá |
| B9 | Mọi trạng thái (lọc, tìm, sắp xếp, cửa hàng, công tắc) lưu trên URL |

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T04.1 | ✅ Chốt hành vi lọc | — | — |
| T04.2 | ✅ Parser/serializer tham số URL (Zod) | T01.1 | Unit: chuỗi URL ↔ object, giá trị không hợp lệ bị bỏ |
| T04.3 | ✅ `listProducts` hỗ trợ B1, B2, B5, B6, B7, B8 | T03.1, T04.2 | Unit/integration ma trận tổ hợp trên seed |
| T04.4 | ✅ `catalog.getFacetCounts()` cho 5 bộ lọc (B3, B4) | T03.1, T04.2 | Integration: số đếm = số SP thực khi chọn lựa chọn đó |
| T04.5 | ✅ `FilterBar` (ADR-009 U8'): hàng chip Nhãn hàng; nút thả xuống Dòng / BST / Chất liệu (chọn nhiều, số đếm, nút "Xem N SP"); ô Cửa hàng + tìm mã ở banner / thanh dính; điện thoại: bảng lọc trượt từ dưới với chip; "Xóa lọc" | T04.4 | E2E 375px & 1280px |
| T04.6 | ✅ Ô tìm mã SP (debounce) | T04.3 | E2E: gõ "ntt0" → ra các SP mã chứa "NTT0" |
| T04.7 | Menu sắp xếp | T04.3 | E2E: từng kiểu sắp xếp đúng thứ tự |
| T04.8 | Công tắc "Xem tất cả SP" (chỉ hiện khi chọn CH) | T04.5 | E2E: CH đặt 5/200 SP → 5; bật → 200, SP không đặt hiển thị 0 |
| T04.9 | Đồng bộ URL; đổi nhãn tự bỏ dòng/BST không còn hợp lệ | T04.5, T03.4 | E2E: copy URL → tab mới cùng kết quả |
| T04.10 | Số kết quả + trạng thái "không có SP phù hợp" | T04.9 | E2E |
| T04.11 | Chỉ mục & đo hiệu năng lọc + đếm + sắp xếp trên seed lớn | T04.3, T04.4, T01.11 | ≤ 1s mỗi yêu cầu |

## Tiêu chí nghiệm thu
- **AC1.** Chọn nhiều nhãn → SP thuộc bất kỳ nhãn nào đã chọn; danh sách Dòng/BST chỉ còn giá trị của các nhãn đó.
- **AC2.** Kết hợp Nhãn + Dòng + BST + Chất liệu cho kết quả đúng quy tắc VÀ/HOẶC.
- **AC3.** "Không thuộc BST" trả đúng các SP không có BST.
- **AC4.** Số đếm cạnh mỗi lựa chọn bằng số SP nhận được khi chọn thêm lựa chọn đó.
- **AC5.** Chọn cửa hàng X: số trên thẻ là của X; mặc định chỉ SP X có đặt > 0; bật công tắc → mọi SP.
- **AC6.** Tìm "abc" ra mọi SP có mã chứa "ABC" (không phân biệt hoa/thường), kết hợp được với bộ lọc.
- **AC7.** Mỗi kiểu sắp xếp cho thứ tự đúng; mặc định Mã A→Z; "Còn thiếu nhiều nhất" theo phạm vi đang xem.
- **AC8.** Tải lại hoặc mở link chia sẻ giữ nguyên lọc, tìm, sắp xếp; "Xóa lọc" về toàn bộ danh mục.
