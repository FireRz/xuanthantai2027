# Checklist UAT (T10.9)

Thực hiện trên bản **Preview/Production đã nạp dữ liệu thật**, có đại diện cửa hàng và quản trị. Ghi kết quả vào cột cuối (Đạt / Không đạt + ghi chú). Biên bản ký ở cuối.

Thiết bị: ☐ iPhone (Safari) ☐ Android (Chrome) ☐ Máy tính (Chrome) ☐ Máy tính (Edge/Safari)

## 1. Người xem (đại diện cửa hàng)

| #   | Việc cần làm                                                 | Kết quả mong đợi                                          | Kết quả |
| --- | ------------------------------------------------------------ | --------------------------------------------------------- | ------- |
| V1  | Mở link, không cần đăng nhập                                 | Thấy danh mục, banner, logo đúng                          |         |
| V2  | Chọn cửa hàng của mình                                       | Chỉ SP có đặt; số Đặt/Về/Thiếu khớp báo cáo của cửa hàng  |         |
| V3  | Bật "Xem tất cả SP"                                          | Hiện thêm SP chưa đặt                                     |         |
| V4  | Lọc theo Nhãn, Dòng, BST, Chất liệu, Khung giá (chọn nhiều)  | Danh sách và số đếm đúng                                  |         |
| V5  | Tìm 3 mã SP (gõ hoa/thường)                                  | Ra đúng SP                                                |         |
| V6  | Thử 5 kiểu sắp xếp                                           | Thứ tự đúng                                               |         |
| V7  | Mở chi tiết 3 SP                                             | Ảnh lớn rõ; bảng SL theo cửa hàng khớp; đóng được         |         |
| V8  | Chuyển Lưới / Bảng                                           | Cả hai dùng được, đọc rõ trên điện thoại                  |         |
| V9  | Xuất Excel khi đang lọc                                      | File đúng danh sách đang lọc, mở được trong Excel         |         |
| V10 | Tìm trên Google tên site (sau go-live)                       | Site không xuất hiện (noindex)                            |         |
| V11 | Tốc độ: tải trang, cuộn, lọc                                 | Không chờ quá lâu trên 4G                                 |         |

## 2. Quản trị

| #   | Việc cần làm                                       | Kết quả mong đợi                                     | Kết quả |
| --- | -------------------------------------------------- | ---------------------------------------------------- | ------- |
| Q1  | Đăng nhập; thử sai mật khẩu 5 lần                  | Vào được; lần sai thứ 5 bị khóa tạm                  |         |
| Q2  | Thêm 1 cửa hàng, 1 nhãn, 1 dòng, 1 BST             | Hiện đúng; ẩn rồi hiện lại được                      |         |
| Q3  | Tải file mẫu, điền 5 SP mới + số lượng, nhập       | Xem trước đúng; áp dụng xong thấy ở trang xem        |         |
| Q4  | Cố ý cho file lỗi (nhãn không tồn tại, SL âm)      | Báo đúng sheet/dòng/cột; nút Áp dụng khóa            |         |
| Q5  | Tải ảnh cho 5 SP bằng .zip, thêm 1 file sai tên    | Khớp / không khớp báo đúng; ảnh hiện trên trang xem  |         |
| Q6  | Sửa 1 SP trong form; sửa nhanh SL                  | Lưu được; trang xem cập nhật                         |         |
| Q7  | Xuất dữ liệu → sửa 1 ô → nhập lại                  | Xem trước chỉ thấy đúng 1 thay đổi                   |         |
| Q8  | Đổi mật khẩu; đăng xuất, đăng nhập lại             | Mật khẩu mới dùng được                               |         |
| Q9  | Ẩn 1 nhãn có SP                                    | Hộp thoại báo số SP bị ảnh hưởng; SP ẩn khỏi trang xem |         |

## 3. Đối chiếu dữ liệu (AC3)

| Hạng mục                   | File nguồn | Trên web | Khớp |
| -------------------------- | ---------- | -------- | ---- |
| Tổng số SP                 |            |          | ☐    |
| Tổng Đặt toàn hệ thống     |            |          | ☐    |
| Tổng Về toàn hệ thống      |            |          | ☐    |
| Từng cửa hàng (Đặt / Về)   |            |          | ☐    |
| Số SP đã có ảnh / tổng     |            |          | ☐    |

## 4. Vận hành

☐ Sao lưu chạy và đã diễn tập khôi phục đạt ☐ Xem được lỗi trong Vercel Logs ☐ Người mới làm theo được `docs/user-guide.md`

## Biên bản nghiệm thu

Lỗi phát hiện:

| #   | Mô tả | Mức độ | Người xử lý | Đã sửa? |
| --- | ----- | ------ | ----------- | ------- |
|     |       |        |             |         |

Kết luận: ☐ Đạt, cho go-live ☐ Đạt có điều kiện: …… ☐ Chưa đạt

Đại diện cửa hàng: ………………… Ngày: …… Chữ ký: ………

Quản trị: ………………… Ngày: …… Chữ ký: ………
