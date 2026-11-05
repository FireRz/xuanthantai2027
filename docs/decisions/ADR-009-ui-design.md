# ADR-009 — Giao diện & Nhận diện

- **Trạng thái:** ✅ Đã chốt (2026-10-30) — chi tiết thực hiện ở [docs/UI-DESIGN.md](../UI-DESIGN.md)
- **Nguồn:** câu trả lời của chủ dự án về nhận diện, màu, phong cách, thẻ SP, bố cục, font, mockup

## Quyết định
| # | Nội dung |
|---|----------|
| U1 | Có **logo công ty**, chưa có bộ màu → chủ dự án đặt file logo vào `docs/brand/` |
| U2 | Tông **Đỏ – vàng Tết**: nền kem `#FBF6EC`, đỏ son `#B3261E`, vàng kim `#C9A227`, chữ nâu đậm `#2B1A12`; header đỏ, nút vàng kim, thẻ nền trắng |
| U3 | Phong cách **cân bằng ảnh & số liệu** |
| U4 | Họa tiết Tết **nhẹ, chỉ ở header** |
| U5 | Số liệu trên thẻ dạng **bảng số nhỏ**: Đặt · Về · Thiếu · % |
| U6 | **Tô màu trạng thái**, 4 trạng thái: Đủ hàng (xanh) · Còn thiếu (cam) · Chưa về (xám) · Không đặt (xám nhạt) |
| U7 | Có nút **chuyển Lưới / Bảng**; **mặc định Lưới** (điện thoại 2 cột, máy tính 4 cột) |
| U8 | Bộ lọc trên máy tính ở **cột bên trái**; điện thoại dạng ngăn kéo |
| U9 | Font: **Playfair Display** (tiêu đề) + **Be Vietnam Pro** (nội dung, số) |
| U10 | Trang quản trị: **trung tính, gọn** (trắng/xám, điểm nhấn đỏ) |
| U11 | Tiêu đề website: **"Xuân Thần Tài 2027"** |
| U12 | **Không** có nền tối |
| U13 | **Làm mockup** (trang mẫu tĩnh) để chủ dự án duyệt **trước khi code** giao diện |

## Sửa đổi sau mockup v1 (2026-10-30)
Góp ý của chủ dự án: mockup v1 "giống báo cáo hơn là một trang web"; muốn tăng khí thế Tết và đổi màu vàng.

| # | Thay đổi | Thay cho |
|---|----------|----------|
| U2' | Vàng chủ đạo đổi sang **vàng cam ấm Tết `#F2A900`** (màu mai vàng) | `#C9A227` ở U2 |
| U4' | **Banner Tết lớn đầu trang**: tiêu đề lớn, câu chúc xuân, cành mai + đồng xu Thần Tài, nền đỏ có họa tiết đồng xu mờ, viền lượn vàng | Họa tiết nhẹ chỉ ở header (U4) |
| U14 | Banner chứa ô **"Cửa hàng của bạn"** + **ô tìm mã SP** + nút "Xem hàng" | Mới |
| U15 | Khu **"Bộ sưu tập mùa này"**: thẻ BST ảnh lớn, bấm vào để lọc theo BST; có thẻ "Ngoài bộ sưu tập" | Mới |
| U5' | Thẻ SP **gọn, ảnh to**: mã · chất liệu, tên, giá, thanh tiến độ + "Về X/Y", "Còn thiếu N"; nhãn trạng thái góc ảnh. Bảng số đầy đủ chỉ ở dạng Bảng và cửa sổ chi tiết | Bảng số nhỏ trên thẻ (U5) |
| U8' | Bộ lọc dạng **nút bấm**: nút thả xuống Nhãn hàng / Dòng / BST / Chất liệu / Khung giá (chọn nhiều; điều chỉnh 2026-11-02: Nhãn hàng và Khung giá không còn là hàng chip, có số đếm, nút "Xem N SP"); điện thoại: bảng lọc trượt từ dưới lên với các chip | Cột lọc trái (U8) |
| U16 | Thêm **chân trang** đỏ đậm (tên web + thời điểm cập nhật dữ liệu) | Mới |

## Sửa đổi sau mockup v2 (2026-10-30)
| # | Thay đổi | Thay cho |
|---|----------|----------|
| U14' | Ô chọn cửa hàng **không đặt trong banner** nữa, mà ở **thanh "Cửa hàng của bạn" ngay dưới banner**, nổi bật (biểu tượng cửa hàng, ô chọn viền đỏ nền vàng nhạt), kèm ô tìm mã SP; thanh **dính trên cùng khi cuộn** (máy tính và điện thoại). Banner chỉ còn nút "Chọn cửa hàng của bạn ↓" dẫn xuống thanh này | U14 |
| U17 | Hình trang trí Tết (cành mai, đồng xu Thần Tài) phải là **ảnh có quyền sử dụng** do chủ dự án cung cấp (mua/tải từ nguồn có giấy phép, hoặc đội thiết kế làm). **Không tự vẽ** (chủ dự án chê hình tự vẽ) và **không lấy ảnh Google** khi không rõ giấy phép. Bỏ luôn họa tiết đồng xu tự vẽ ở nền banner. Trong lúc chờ, mockup để ô "Ảnh trang trí Tết (chờ file)" | Hình SVG tự vẽ ở U4' |
| U18 | **Phong cách banner** (chủ dự án gửi ảnh mẫu tìm trên Google): tranh Tết kiểu cổ — **nền đỏ trơn ở giữa**, cành hoa trắng kem góc trên trái, **mây lành** viền vàng kem, **con dê (năm Đinh Mùi 2027)** góc dưới trái, núi và ấn triện đỏ. Ảnh dùng làm **nền toàn banner**, chữ đặt giữa phần nền đỏ trơn. Mockup đang dùng **tạm** ảnh mẫu này, có ghi chú "Ảnh tham khảo — cần mua bản quyền". **Trước khi go-live** phải mua/được cấp bản quyền ảnh này (hoặc ảnh tương tự), bản rộng ≥ 2400px | Ô chờ ảnh ở U17 |
| U18' | Chủ dự án gửi **ảnh banner chính thức** (1518×1036, cùng phong cách U18) → lưu `docs/brand/tet-banner.png`, đã thay vào mockup, bỏ ghi chú "ảnh tham khảo". Cần ghi nguồn/quyền sử dụng ảnh vào `docs/brand/LICENSE.txt`. Bản 1518px hơi nhỏ cho màn hình rộng — nếu có, nên dùng bản ≥ 2400px | Ảnh tham khảo ở U18 |

## Sửa đổi khi dùng thử (2026-11-04)
| # | Thay đổi | Thay cho |
|---|----------|----------|
| U14'' | **Điện thoại:** khi đã cuộn qua banner, thanh "Cửa hàng của bạn" chỉ còn **hàng tìm mã SP** (hàng chọn cửa hàng lùi khuất phía trên, kéo lên đầu trang thì hiện lại) để phần dính không chiếm quá nhiều màn hình; cửa hàng đang xem vẫn ghi ở nhãn phạm vi trên danh sách. Máy tính giữ nguyên cả thanh | Thanh dính đủ hai hàng trên điện thoại ở U14' |

## Sửa đổi khi dùng thử (2026-11-05)
| # | Thay đổi | Thay cho |
|---|----------|----------|
| U16' | **Chân trang khớp banner và gọn hơn:** nền đỏ `--color-festive` `#CC1208` dùng chung với banner, viền lượn vàng ở mép trên; chiều cao giảm từ 334px xuống khoảng 186px trên điện thoại 375px, từ 148px xuống khoảng 104px trên máy tính (logo và tên cùng một hàng, link Phân tích chung hàng với nút Teams). Tên chi nhánh giữ màu trắng vì chữ vàng trên nền đỏ này chưa đạt tương phản 3:1 | Nền đỏ đậm `#8E1B16` ở U16 |
