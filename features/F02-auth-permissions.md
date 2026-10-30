# F02 — Đăng nhập quản trị

**Ưu tiên:** Must · **Milestone:** M1 · **Quyết định:** ADR-004, ADR-005 (Q-26) ✅

## Mục tiêu
Trang xem công khai; chỉ **một quản trị** đăng nhập để cập nhật dữ liệu.

## Phạm vi
- Trang xem: không đăng nhập; chặn công cụ tìm kiếm (`robots.txt` + `noindex`).
- Đăng nhập / đăng xuất tài khoản quản trị duy nhất.
- Bảo vệ `/admin/*`, mọi Server Action ghi, API cấp token upload Blob.
- Đổi mật khẩu; script đặt lại mật khẩu; tạm khóa khi sai nhiều lần.

**Không làm:** nhiều người dùng, vai trò, phân quyền theo cửa hàng.

## Tasks

| ID | Task | Phụ thuộc | Cách kiểm thử |
|----|------|-----------|---------------|
| T02.1 | ✅ Chốt phương thức xác thực | — | — |
| T02.2 | Auth.js Credentials + `/login` | T01.5 | E2E: đúng mật khẩu → `/admin`; sai → báo lỗi |
| T02.3 | Middleware bảo vệ `/admin/*`; trang xem công khai | T02.2 | E2E: chưa đăng nhập vào `/admin` → `/login`; `/` xem được |
| T02.4 | `requireAdmin()` cho mọi Server Action / API ghi, gồm `/api/blob-upload` | T02.2 | Integration: gọi khi chưa đăng nhập → 401 |
| T02.5 | Script `npm run admin:set-password` | T02.2 | Chạy script → đăng nhập bằng mật khẩu mới |
| T02.6 | Trang đổi mật khẩu `/admin/account` | T02.4 | E2E: mật khẩu cũ hết hiệu lực |
| T02.7 | Tạm khóa sau 5 lần sai trong 15 phút *(mặc định kỹ thuật)* | T02.2 | Test: lần thứ 6 bị chặn |
| T02.8 | `robots.ts` Disallow all + meta `noindex, nofollow` | T01.1 | Kiểm tra `/robots.txt` và thẻ meta trên `/` |

## Tiêu chí nghiệm thu
- **AC1.** Bất kỳ ai mở trang xem đều xem được, không bị yêu cầu đăng nhập.
- **AC2.** Người chưa đăng nhập không thực hiện được bất kỳ thao tác ghi nào, kể cả gọi trực tiếp API.
- **AC3.** Mật khẩu lưu dạng băm, không hiển thị lại.
- **AC4.** Quản trị đổi được mật khẩu; đặt lại được bằng script khi quên.
- **AC5.** Trang xem trả về `robots.txt` chặn toàn bộ và thẻ `noindex`.
