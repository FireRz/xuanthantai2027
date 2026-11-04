# ADR-012 — Trang phân tích `/phan-tich` và mật khẩu xem chung

- **Trạng thái:** Đã chốt (2026-11-04)
- **Nguồn:** Spec `docs/superpowers/specs/2026-11-04-analytics-dashboard-design.md` §3 và §5.1.

## Quyết định (truy cập)
| # | Nội dung |
|---|----------|
| P1 | `/phan-tich` và dữ liệu của nó chỉ hiện khi có cookie xem hợp lệ **hoặc** đang đăng nhập admin. |
| P2 | Chưa có cookie: hiện form "Mật khẩu xem phân tích" (một ô mật khẩu, nút **Xem**). |
| P3 | Mật khẩu lưu dạng băm scrypt như mật khẩu admin (`src/lib/password.ts`); độ dài tối thiểu theo `assertPasswordPolicy`. |
| P4 | Sai `MAX_FAILED_ATTEMPTS` (5) lần liên tiếp thì khóa `LOCK_WINDOW_MS` (15 phút). Bộ đếm đếm chung, không theo IP. Đang khóa thì không kiểm tra mật khẩu; lần sai cách lần trước quá 15 phút thì đếm lại. |
| P5 | Đúng thì đặt cookie `xtt_view`: HMAC-SHA256 bằng `AUTH_SECRET`, `HttpOnly`, `Secure` (production), `SameSite=Lax`, 30 ngày. Nội dung gồm phiên bản mật khẩu và thời điểm hết hạn; hạn được kiểm ở server, không chỉ dựa `Max-Age`. |
| P6 | Đổi hoặc tắt mật khẩu thì tăng **phiên bản**; mọi cookie cũ hết hiệu lực. |
| P7 | Chưa đặt mật khẩu: trang hiện "Trang phân tích chưa mở", không có form. Admin vẫn vào được. |
| P8 | Admin đặt, đổi hoặc tắt mật khẩu ở `/admin/account`. |
| P9 | `noindex` như mọi trang (ADR-005 I6). Lối vào: menu admin và link nhỏ ở chân trang danh mục. |
| P10 | Đây là cổng gom số tổng hợp, **không phải bảo mật dữ liệu**: danh mục công khai vẫn hiện số lượng (ADR-004 A1). |

## Cách làm
- Bảng `app_setting(key, value, updated_at)` với bốn khóa: `viewer_password_hash`, `viewer_password_version`, `viewer_failed_count`, `viewer_locked_until`.
- Cookie: `base64url("phiênbản.hạnMs") + "." + base64url(HMAC)`; so chữ ký bằng `timingSafeEqual`. Thiếu `AUTH_SECRET` thì ném lỗi, không ký bằng khóa rỗng.
- Cookie chỉ có hiệu lực khi mật khẩu đang được đặt và đúng phiên bản hiện tại.

## Công thức số liệu (spec §5.1)
Tính trên tổng của tập SP, không lấy trung bình tỷ lệ từng mã:
- Đặt, Về, Bán, Tồn = tổng theo phạm vi cửa hàng của danh mục (ADR-002 D6).
- Thiếu = Σ `max(Đặt−Về, 0)` của **từng SP**, khớp cột Thiếu của danh mục.
- % hàng về = `min(ΣVề / ΣĐặt, 1)`; ΣĐặt = 0 thì "—".
- % bán = `sellThrough(ΣBán, ΣTồn)`; mẫu số 0 thì "—".

## Rủi ro đã chấp nhận
- **Khóa chung:** vì chỉ có một mật khẩu và bộ đếm không theo IP, ai đó cố tình nhập sai 5 lần có thể làm mọi người chưa có cookie phải chờ 15 phút. Người đã có cookie và admin không bị ảnh hưởng.
- Ai biết mật khẩu có thể chia sẻ; không có tài khoản riêng cho từng người xem.
