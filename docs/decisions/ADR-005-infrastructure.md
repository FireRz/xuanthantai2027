# ADR-005 — Hạ tầng triển khai

- **Trạng thái:** ✅ Đã chốt (2026-10-30)
- **Nguồn:** Q-20 ("vercel"), chọn gói ("Hobby giai đoạn thử"), dịch vụ lưu trữ ("bạn chọn giúp"), Q-26 (chặn công cụ tìm kiếm), Q-21 (6–8 tuần)

## Quyết định
| # | Nội dung |
|---|----------|
| I1 | Host ứng dụng trên **Vercel** |
| I2 | **Gói Hobby (miễn phí) trong giai đoạn phát triển/thử**; **chuyển Vercel Pro (~20 USD/tháng) trước khi go-live** vì Hobby chỉ cho mục đích phi thương mại |
| I3 | CSDL: **Neon Postgres** (tích hợp Vercel Marketplace, có gói miễn phí, có nhánh DB cho preview) |
| I4 | Ảnh: **Vercel Blob** (tích hợp sẵn, CDN) |
| I5 | Môi trường: Preview (mỗi nhánh) + Production; dev cục bộ dùng Docker Postgres |
| I6 | Trang xem: `robots.txt` Disallow + thẻ `noindex` (Q-26) |
| I7 | Mục tiêu go-live: **trong 6–8 tuần** → khoảng **2026-12-11 đến 2026-12-25** |

## Ràng buộc kỹ thuật do Vercel & cách xử lý
| Ràng buộc | Xử lý |
|-----------|-------|
| Request gửi tới function giới hạn ~4,5 MB | **Ảnh và file Excel tải trực tiếp từ trình duyệt lên Vercel Blob** (client upload); server đọc từ Blob |
| Thời gian chạy function có giới hạn (Hobby ngắn hơn Pro) | Import xử lý theo lô trong transaction; đo ở T08.10 với dữ liệu quy mô "vừa"; nếu vượt, tách bước áp dụng thành nhiều lô có thể tiếp tục |
| Hạn mức tối ưu ảnh của Vercel | **Thu nhỏ ảnh ngay trên trình duyệt** trước khi tải (ảnh lớn ~1600px + thumbnail ~400px, WebP) — không phụ thuộc dịch vụ tối ưu ảnh |
| Không có ổ đĩa lâu dài | Mọi file lưu trên Blob; không ghi file cục bộ |

## Việc của chủ dự án
- Tạo tài khoản Vercel (và nâng Pro trước go-live), kết nối Neon và Blob từ dashboard Vercel.
- Tên miền: dùng tên miền `*.vercel.app` hay tên miền riêng — có thể quyết định lúc go-live, không chặn Coding.

## Sao lưu
- Neon: khôi phục theo thời điểm (point-in-time) theo gói; thêm bản dump định kỳ (GitHub Action hằng ngày) lưu sang Blob.
- Ảnh: tên file theo mã SP, có thể tải lại từ nguồn của chủ dự án.
