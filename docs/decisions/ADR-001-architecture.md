# ADR-001 — Phương án kiến trúc

- **Trạng thái:** ✅ Đã chốt (2026-10-30)
- **Nguồn:** Q-08 (dữ liệu từ Excel), Q-20 (Vercel), Q-12 (quy mô vừa)

## Quyết định
Phương án **A** trong ARCHITECTURE §2: một ứng dụng **Next.js (App Router) + TypeScript** chứa cả trang xem công khai và khu vực quản trị; **PostgreSQL** qua Prisma; ảnh lưu ở object storage.

## Lý do
- Nguồn là file Excel tải lên → cần kiểm tra dữ liệu chặt và ghi trong transaction (loại phương án Google Sheets).
- Bộ lọc nhiều chiều có đếm số SP, sắp xếp theo "còn thiếu" → cần CSDL quan hệ.
- Next.js chạy tự nhiên trên Vercel (ADR-005).
