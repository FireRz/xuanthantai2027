# F10 — Triển khai, Vận hành & Nghiệm thu

**Ưu tiên:** Must · **Milestone:** M1 (môi trường) + M4 (go-live) · **Quyết định:** ADR-005 ✅

## Mục tiêu
Đưa hệ thống lên Vercel an toàn, có sao lưu, có hướng dẫn, được nghiệm thu, go-live trong 6–8 tuần (mục tiêu 2026-12-18, hạn chót 2026-12-25).

## Phạm vi
- Vercel (Hobby khi thử → **Pro trước go-live**), Neon Postgres, Vercel Blob.
- Preview deployment cho mỗi nhánh; Production từ nhánh chính.
- Sao lưu & khôi phục; giám sát lỗi.
- Nhập dữ liệu thật; UAT; tài liệu hướng dẫn.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T10.1 | ✅ Chốt hạ tầng | — | — |
| T10.2 | Kết nối repo với Vercel; tạo Neon + Blob qua Vercel; biến môi trường Preview/Production | T01.1 | Preview deploy chạy được |
| T10.3 | Chạy `prisma migrate deploy` trong quy trình deploy; `/api/health` | T10.2, T01.5 | Deploy mới tự migrate; health 200 |
| T10.4 | Sao lưu: GitHub Action `pg_dump` hằng ngày → Blob, giữ 7 bản; **diễn tập khôi phục** | T10.2 | Khôi phục bản dump vào DB trống, dữ liệu đầy đủ |
| T10.5 | Giám sát lỗi (Vercel logs + cảnh báo lỗi 5xx) | T10.2 | Gây lỗi giả → thấy trong log/cảnh báo |
| T10.6 | Nhập dữ liệu thật: cửa hàng, danh mục → mẫu Excel → nhập → ảnh | F06, T07.8, T08.9 | Đối chiếu số SP, tổng Đặt/Về theo từng CH với file nguồn |
| T10.7 | E2E toàn luồng trên Preview + kiểm thử trên **điện thoại và máy tính thật** | F03–F08, F11, T10.6 | Bộ E2E xanh; checklist thiết bị đạt |
| T10.8 | Hướng dẫn: (a) người xem: lọc theo cửa hàng mình, tìm mã, xuất Excel; (b) quản trị: thứ tự nhập, điền mẫu, đặt tên ảnh, xuất–sửa–nhập lại, đặt lại mật khẩu | F03–F08, F11 | Người mới làm theo được |
| T10.9 | UAT với đại diện cửa hàng và quản trị; biên bản | T10.7, T10.8 | Biên bản ký duyệt |
| T10.10 | Checklist go-live: **nâng Vercel Pro**, **ảnh banner Tết đã ghi nguồn/quyền sử dụng trong `docs/brand/LICENSE.txt`** (ADR-009 U18'), logo thật, tên miền, mật khẩu quản trị mạnh, `noindex` kiểm tra, sao lưu chạy; go-live; theo dõi 2 tuần | T10.9 | Mọi mục checklist đạt |

## Tiêu chí nghiệm thu
- **AC1.** Production chạy HTTPS trên Vercel **gói Pro**.
- **AC2.** Sao lưu chạy tự động hằng ngày; đã khôi phục thử thành công.
- **AC3.** Dữ liệu ban đầu khớp file nguồn (số SP, tổng Đặt/Về theo từng cửa hàng).
- **AC4.** Biên bản UAT ký bởi đại diện cửa hàng và quản trị.
- **AC5.** Có hướng dẫn cho người xem và quản trị.
- **AC6.** Go-live không muộn hơn 2026-12-25.
