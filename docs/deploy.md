# Triển khai — Vercel + Neon + Blob (T10.2, T10.3)

> ADR-005. Giai đoạn thử dùng **Vercel Hobby**; **nâng Pro trước go-live** (T10.10).
> Mọi bước đăng nhập / tạo tài nguyên dưới đây do **chủ dự án** làm trên trình duyệt.

## Cách ứng dụng deploy

- Vercel chạy script `vercel-build` = `prisma migrate deploy && next build` → **mỗi lần deploy tự áp dụng migration** lên CSDL của môi trường đó (Production, hoặc nhánh DB riêng của Preview).
- `prisma migrate deploy` dùng `DATABASE_URL_UNPOOLED` (kết nối trực tiếp); ứng dụng dùng `DATABASE_URL` (pooled). Cả hai do tích hợp Neon tự tạo.
- Kiểm tra sống: `GET /api/health` → `200 {"status":"ok","db":"ok"}`; CSDL lỗi → `503`.

## Biến môi trường

| Biến                    | Nguồn                                   | Môi trường                       |
| ----------------------- | --------------------------------------- | -------------------------------- |
| `DATABASE_URL`          | Tích hợp Neon (tự tạo)                  | Production, Preview, Development |
| `DATABASE_URL_UNPOOLED` | Tích hợp Neon (tự tạo)                  | Production, Preview, Development |
| `BLOB_READ_WRITE_TOKEN` | Kết nối Blob store (tự tạo)             | Production, Preview, Development |
| `AUTH_SECRET`           | Tự tạo (bước 5), mỗi môi trường một giá trị | Production, Preview          |

## Các bước (chủ dự án)

**1. Đưa code lên GitHub**

1. Trên github.com → **New repository** → tên ví dụ `xuan-than-tai`, chọn **Private**, **không** tick tạo README/.gitignore.
2. Gửi link repo cho người phát triển; sau khi anh/chị cho phép, code sẽ được push lên nhánh `main`.

**2. Tạo project trên Vercel**

1. vercel.com → **Add New… → Project** → **Import** repo vừa tạo.
2. Framework: **Next.js** (tự nhận). Không cần sửa Build Command (Vercel tự dùng `vercel-build`).
3. Bấm **Deploy**. Lần đầu có thể lỗi vì chưa có CSDL — bình thường, làm tiếp bước 3.

**3. Tạo CSDL Neon qua Vercel**

1. Trong project → tab **Storage** → **Create Database** → chọn **Neon** (Serverless Postgres) → **Continue**.
2. Region: chọn **Singapore (ap-southeast-1)** (gần Việt Nam nhất). Gói: **Free**.
3. Đặt tên `xtt-db` → **Create** → màn hình **Connect Project**: chọn project này, tick **Production, Preview, Development**.
4. Nếu có tùy chọn **"Create database branch for deployment" → Preview**: **bật** (mỗi Preview có nhánh DB riêng, không đụng dữ liệu thật).
5. Kiểm tra: **Settings → Environment Variables** có `DATABASE_URL` và `DATABASE_URL_UNPOOLED`.

**4. Tạo Blob store**

1. Tab **Storage** → **Create Database** → **Blob** → tên `xtt-blob` → **Create**.
2. **Connect Project**: chọn project này, tick **Production, Preview, Development**.
3. Kiểm tra: có biến `BLOB_READ_WRITE_TOKEN`.

**5. Thêm `AUTH_SECRET`**

1. Tạo chuỗi ngẫu nhiên trên máy: `npx auth secret --raw` (hoặc `openssl rand -base64 32`). **Không gửi chuỗi này qua chat.**
2. **Settings → Environment Variables** → **Add**: Key `AUTH_SECRET`, Value = chuỗi vừa tạo, chọn **Production**. Lặp lại với một chuỗi khác cho **Preview**.

**6. Deploy lại và kiểm tra**

1. Tab **Deployments** → deployment mới nhất → **⋯ → Redeploy**.
2. Trong log build thấy `prisma migrate deploy` báo `All migrations have been successfully applied` (hoặc `No pending migrations`).
3. Mở `https://<tên-project>.vercel.app/api/health` → thấy `{"status":"ok","db":"ok"}`.

**7. Token Blob cho máy dev (để chạy test T01.9)**

Tab **Storage** → `xtt-blob` → **.env.local** → sao chép dòng `BLOB_READ_WRITE_TOKEN=...` vào file `.env` trên máy (không commit). Chạy `npm run test:integration` — test upload/xóa Blob sẽ tự chạy.

**8. Bảo vệ nhánh `main` (CI chặn merge — F01 AC5)**

GitHub repo → **Settings → Branches → Add branch ruleset** (hoặc *Branch protection rule*) cho `main`: bật **Require status checks to pass** → chọn check **check** (workflow CI).

**9. Tạo tài khoản quản trị (và đặt lại khi quên mật khẩu)**

1. Trên máy, trong file `.env` đặt `DATABASE_URL` = chuỗi kết nối **không pool** của CSDL cần tạo (Vercel → Storage → Neon → `DATABASE_URL_UNPOOLED`).
2. Chạy `npm run admin:set-password` (thêm `-- --username=ten` nếu muốn tên khác "admin"). Script hỏi mật khẩu 2 lần, **không hiện ký tự**, tối thiểu 10 ký tự.
3. Quên mật khẩu: chạy lại đúng lệnh trên — mật khẩu cũ hết hiệu lực, mọi phiên đăng nhập cũ bị đăng xuất, khóa tạm (nếu có) được gỡ.
4. **Không gửi mật khẩu qua chat, không ghi vào mã nguồn.** Xong nhớ trả `DATABASE_URL` trong `.env` về CSDL dev.

## Sự cố thường gặp

| Hiện tượng                                       | Cách xử lý                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Build lỗi `Environment variable not found: DATABASE_URL` | Chưa kết nối Neon với môi trường đó (bước 3.3)                                  |
| `/api/health` trả 503                            | Sai/thiếu biến DB của môi trường đang xem; xem **Logs** của deployment                |
| Migration lỗi trên Preview                       | Xem log build; Preview dùng nhánh DB riêng nên không ảnh hưởng Production            |

## Sao lưu và khôi phục (T10.4)

- **Sao lưu hằng ngày:** workflow `Backup` (`.github/workflows/backup.yml`) chạy 03:00 giờ Việt Nam: `pg_dump` (định dạng custom) CSDL production → Vercel Blob `backups/xtt-<UTC>.dump` (private), tự xóa bản cũ, giữ 7 bản mới nhất. Dump chứa cả băm mật khẩu quản trị nên Blob để chế độ private.
- **Secrets GitHub cần tạo** (repo → Settings → Secrets and variables → Actions):
  - `BACKUP_DATABASE_URL`: chuỗi kết nối **không pool** của Neon **production** (`DATABASE_URL_UNPOOLED`).
  - `BLOB_READ_WRITE_TOKEN`: token của Blob store `xtt-blob`.
  - Không gửi các giá trị này qua chat.
- **Chạy thử ngay:** Actions → **Backup** → Run workflow; kiểm tra Blob có file trong `backups/`.
- **Diễn tập khôi phục:** Actions → **Restore drill** → Run workflow. Workflow tải bản mới nhất, `pg_restore` vào Postgres trống, rồi `scripts/verify-restore.mjs` so số dòng từng bảng với production (chỉ đọc). Đạt khi in `ĐẠT: số dòng mọi bảng khớp`. Diễn tập lại mỗi khi đổi cấu trúc dữ liệu lớn và trước go-live.
- **Khôi phục thật khi sự cố:** tải file từ Blob (dashboard Vercel → Storage → `xtt-blob`), tạo DB Neon trống (hoặc nhánh mới), rồi
  `pg_restore --no-owner --no-privileges --dbname=<url-không-pool> xtt-<mốc>.dump`; đổi `DATABASE_URL`/`DATABASE_URL_UNPOOLED` của Production sang DB mới và redeploy. Neon cũng có khôi phục theo thời điểm (tùy gói) — dùng cho sự cố trong vài giờ gần nhất.
- Ảnh sản phẩm nằm trên Blob, không nằm trong dump; nguồn gốc ảnh do chủ dự án giữ (ADR-005).
