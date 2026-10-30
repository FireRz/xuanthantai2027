# Xuân Thần Tài 2027

Website bộ sưu tập trang sức mùa Xuân Thần Tài — xem [PROJECT.md](PROJECT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [TASKS.md](TASKS.md).

Stack: Next.js 15 (App Router) + TypeScript · Tailwind + shadcn/ui · Prisma + Postgres (Neon) · Vercel Blob · Vitest + Playwright.

## Chạy cục bộ

Yêu cầu: Node.js ≥ 20, npm. Postgres lấy theo **một trong hai** cách dưới.

```bash
npm install
cp .env.example .env          # sửa nếu cần
```

**Postgres — cách 1 (có Docker):**

```bash
docker compose up -d          # tạo DB xtt và xtt_test ở cổng 5432
```

**Postgres — cách 2 (không Docker, Windows/macOS/Linux):**

```bash
npm run db:local              # giữ cửa sổ này mở trong lúc dev
```

Binary Postgres không chạy được từ đường dẫn có dấu tiếng Việt, nên script chép binary và dữ liệu vào `~/.xuan-than-tai` (đặt `LOCAL_PG_HOME` trong `.env` để đổi chỗ, ví dụ ổ khác). Tắt bằng Ctrl+C.

**Tạo bảng, dữ liệu mẫu, chạy web:**

```bash
npm run db:migrate            # áp dụng migration
npm run seed                  # 3 nhãn, 5 chất liệu, 10 cửa hàng, 200 SP (chạy lại không lỗi)
npm run dev                   # http://localhost:3000
```

Seed quy mô lớn để đo hiệu năng (3.000 SP × 100 cửa hàng = 300.000 dòng SL, ~10 giây):

```bash
npm run seed:large
```

## Kiểm thử

| Lệnh                       | Nội dung                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`             | ESLint                                                                                     |
| `npm run typecheck`        | TypeScript                                                                                 |
| `npm run test:unit`        | Vitest — `tests/unit`                                                                      |
| `npm run test:integration` | Vitest — `tests/integration`, dùng DB `TEST_DATABASE_URL` (bị xóa trắng mỗi lần chạy) |
| `npm test`                 | Cả unit + integration                                                                      |
| `npm run test:e2e`         | Playwright, 2 viewport: mobile 375px và desktop 1280px                                     |

Lần đầu chạy E2E: `npx playwright install chromium`.

## Cấu trúc chính

- `prisma/schema.prisma`, `prisma/migrations/` — mô hình dữ liệu (ARCHITECTURE §4); CHECK ≥ 0, unique mã SP không phân biệt hoa/thường và view `product_totals` nằm trong SQL migration.
- `src/lib/metrics.ts` — công thức Còn thiếu / Tỷ lệ về (ADR-007), dùng chung toàn hệ thống.
- `src/server/repositories/visibility.ts` — điều kiện "SP hiển thị được" (ARCHITECTURE §4.2).
- `src/server/storage/blob.ts` — adapter Vercel Blob.

## Triển khai

Vercel + Neon + Blob — xem [docs/deploy.md](docs/deploy.md).
