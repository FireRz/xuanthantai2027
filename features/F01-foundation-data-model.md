# F01 — Nền tảng dự án & Mô hình dữ liệu

**Ưu tiên:** Must · **Milestone:** M1 · **Quyết định:** ADR-001, 002, 003, 005, 007, 008 ✅

## Mục tiêu
Dựng khung dự án, môi trường phát triển, CI và mô hình dữ liệu làm nền cho mọi feature.

## Phạm vi
- Repo Next.js + TypeScript, lint, format, test.
- Dev cục bộ: Docker Postgres; Vercel Blob dùng token store dev.
- Schema theo ARCHITECTURE §4: Brand, ProductLine, Collection, Material, Store, Product, StoreProductQty, AdminUser.
- View/truy vấn `product_totals` + module `lib/metrics.ts` (công thức thiếu, tỷ lệ).
- Seed dữ liệu mẫu.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T01.1 | Khởi tạo Next.js + TS, ESLint, Prettier, Tailwind, shadcn/ui, cấu trúc thư mục | — | `npm run build`, `npm run lint` thành công |
| T01.2 | `docker-compose` (Postgres) + `.env.example` (DATABASE_URL, BLOB_READ_WRITE_TOKEN, AUTH_SECRET) | T01.1 | Kết nối được DB cục bộ |
| T01.3 | Cấu hình Vitest + Playwright (2 project: mobile 375px, desktop 1280px) | T01.1 | Test mẫu pass |
| T01.4 | ✅ Chốt mô hình dữ liệu | — | ADR đã duyệt |
| T01.5 | `schema.prisma` + migration: unique (sku, store.code, brand.name, material.name, (brand_id,name) cho line/collection), PK (product_id, store_id), CHECK ≥ 0, chỉ mục lọc | T01.2 | Migration chạy trên DB trống; test từng ràng buộc unique/CHECK |
| T01.6 | Repository + điều kiện "SP visible" (ARCHITECTURE §4.2) + ràng buộc cùng nhãn | T01.5 | Integration: ẩn nhãn → SP không visible; gán dòng khác nhãn → lỗi |
| T01.7 | `lib/metrics.ts` + truy vấn `product_totals` (tổng chỉ tính CH active) | T01.5 | Unit test bảng ví dụ ADR-007 (A 5/7, B 5/3 → thiếu tổng 0, tỷ lệ 100%; đặt 0 → null) |
| T01.8 | Seed: 3 nhãn × (3 dòng + 2 BST), 5 chất liệu, 10 CH, 200 SP (có SP không BST, không giá, về > đặt) | T01.5 | `npm run seed` chạy lại không lỗi |
| T01.9 | Adapter Vercel Blob (put, delete, cấp token client upload) | T01.2 | Integration với store dev: upload/xóa file |
| T01.10 | CI GitHub Actions: lint + unit + integration (Postgres service) + build | T01.3 | CI xanh trên nhánh chính |
| T01.11 | Seed quy mô lớn (3.000 SP × 100 CH) cho đo hiệu năng | T01.8 | Script chạy được, dùng ở T04.8, T08.10 |

## Tiêu chí nghiệm thu
- **AC1.** Lập trình viên mới chạy được ứng dụng cục bộ với dữ liệu mẫu trong ≤ 30 phút theo README.
- **AC2.** CSDL từ chối SP trùng mã, cửa hàng trùng mã, SL hoặc giá âm.
- **AC3.** Công thức thiếu/tỷ lệ cho kết quả đúng mọi ví dụ trong ADR-007.
- **AC4.** SP thuộc nhãn/dòng/BST/chất liệu bị ẩn không được trả về ở truy vấn trang xem.
- **AC5.** CI chặn merge khi lint/test/build lỗi.
