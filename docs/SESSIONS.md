# SESSIONS — Chia việc Coding thành các phiên chat

> Lập ngày 2026-10-30, sau khi mockup được duyệt.
> Mỗi phiên = một nhóm task liền mạch, kết thúc bằng code chạy được + test xanh + cập nhật cột trạng thái trong [TASKS.md](../TASKS.md).

## 1. Tổng số task

| Hạng mục | Số task |
|----------|---------|
| Tổng trong TASKS.md | **94** |
| Đã xong (quyết định + mockup) | 9 |
| **Còn phải làm (code, test, triển khai)** | **85** |
| — cỡ S (≤ 0,5 ngày người) | 54 |
| — cỡ M (1–2 ngày người) | 29 |
| — cỡ L (3–5 ngày người) | 2 (T07.8 tải ảnh hàng loạt, T08.7 kiểm tra file Excel) |

Theo từng Feature (còn lại): F01: 10 · F02: 7 · F03: 14 · F04: 10 · F05: 5 · F06: 6 · F07: 9 · F08: 9 · F10: 9 · F11: 6.

## 2. Các phiên đề xuất: 9 phiên

| # | Phiên | Task | Số task | Cần xong trước |
|---|-------|------|---------|----------------|
| 1 | **Nền tảng & dữ liệu** | T01.1–T01.11 (trừ T01.4), T10.2, T10.3 | 12 | — |
| 2 | **Đăng nhập quản trị** | T02.2–T02.8 | 7 | 1 |
| 3 | **Trang xem: khung giao diện & danh mục** | T03.1–T03.14 | 14 | 1 |
| 4 | **Lọc, tìm, sắp xếp** | T04.2–T04.11 | 10 | 3 |
| 5 | **Popup chi tiết & xuất Excel người xem** | T05.2–T05.6, T11.1–T11.3 | 8 | 4 |
| 6 | **Quản trị danh mục** (nhãn, dòng, BST, chất liệu, cửa hàng) | T06.1–T06.6 | 6 | 2 |
| 7 | **Sản phẩm & tải ảnh hàng loạt** | T07.1–T07.9 | 9 | 6 |
| 8 | **Nhập Excel, sửa SL, xuất Excel quản trị** | T08.2–T08.10, T11.4–T11.6 | 12 | 7 (và 4 cho T08.4) |
| 9 | **Vận hành, dữ liệu thật, UAT, go-live** | T10.4–T10.10 | 7 | 1–8 |

**Tổng: 85 task / 9 phiên.**

### Thứ tự & làm song song
```
1 ──► 2 ──► 6 ──► 7 ──► 8 ──┐
 └──► 3 ──► 4 ──► 5 ────────┴──► 9
```
- Sau phiên 2, hai nhánh **trang xem (3→4→5)** và **quản trị (6→7→8)** có thể chạy **song song** ở hai phiên chat khác nhau (mỗi phiên làm trên nhánh git riêng), vì chúng sửa các file khác nhau.
- Nếu làm tuần tự từng phiên một: thứ tự 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.

### Vì sao không gộp ít phiên hơn
Mỗi phiên nên vừa đủ để giữ toàn bộ ngữ cảnh (tài liệu + code liên quan) mà không bị quá dài; phiên dài dễ quên quy tắc đã chốt. Phiên 3 và 8 là hai phiên nặng nhất.

## 3. Việc của chủ dự án theo phiên
| Trước phiên | Việc |
|-------------|------|
| 1 | Tạo tài khoản **GitHub** (để lưu code) và **Vercel** (gói Hobby để thử); kết nối Neon + Blob trong Vercel khi phiên 1 hướng dẫn |
| 3 | Đặt **logo** (bản màu + bản trắng) vào `docs/brand/` |
| 9 | Danh sách cửa hàng, file Excel dữ liệu thật, ảnh sản phẩm; nâng **Vercel Pro**; tên miền; ghi nguồn ảnh banner vào `docs/brand/LICENSE.txt` |

## 4. Một prompt có đủ cho cả phiên không?

**Đủ để bắt đầu và làm hết phiên**, vì mọi quy tắc, task, cách kiểm thử đã nằm trong tài liệu — prompt chỉ cần chỉ đúng phạm vi. Tuy nhiên:
- Phiên sẽ **làm lần lượt từng task**, chạy test và **commit sau mỗi task**, rồi tự làm tiếp; không cần anh/chị nhắn lại sau mỗi task.
- Phiên sẽ **dừng lại hỏi** khi cần anh/chị: tạo/kết nối tài khoản (GitHub, Vercel), duyệt giao diện thật so với mockup, cho phép push code, hoặc gặp điểm nghiệp vụ chưa rõ.
- Phiên dài sẽ được hệ thống tự tóm tắt ngữ cảnh để làm tiếp; tài liệu là "bộ nhớ" chung nên không mất quy tắc.
- Nếu phiên bị ngắt giữa chừng: mở phiên mới, dán lại đúng prompt đó và thêm câu **"Tiếp tục từ task đầu tiên chưa ✅ trong TASKS.md"**.
- Hai phiên nặng nhất (3 và 8) có thể tách đôi nếu muốn: 3a = T03.1–T03.8, 3b = T03.9–T03.14; 8a = T08.2–T08.6, 8b = T08.7–T08.10 + T11.4–T11.6.

## 5. Prompt cho từng phiên

Mọi prompt dùng chung phần **[CHUNG]** dưới đây (đã chèn sẵn vào từng prompt):

> [CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/*, docs/SESSIONS.md và các file features/ liên quan. Làm lần lượt từng task theo thứ tự phụ thuộc trong TASKS.md; mỗi task: viết code + test đúng cột "Cách kiểm thử", chạy lint/test, commit (message tiếng Việt, mã task ở đầu), đánh ✅ trong TASKS.md. Giao diện phải khớp mockup đã duyệt. Không tự thêm quy tắc nghiệp vụ; điểm chưa rõ thì hỏi tôi. Không push lên GitHub khi chưa được tôi cho phép. Cuối phiên: báo cáo task xong / chưa xong / việc tôi cần làm.

### Phiên 1 — Nền tảng & dữ liệu
```
Thực hiện PHIÊN 1 trong docs/SESSIONS.md: T01.1, T01.2, T01.3, T01.5–T01.11, T10.2, T10.3.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/*, docs/SESSIONS.md và features/F01, features/F10. Làm lần lượt từng task theo thứ tự phụ thuộc; mỗi task: code + test đúng cột "Cách kiểm thử", chạy lint/test, commit, đánh ✅ trong TASKS.md. Không tự thêm quy tắc nghiệp vụ; điểm chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo xong / chưa xong / việc tôi cần làm.
Riêng phiên này:
- Thư mục chưa là git repo: git init trước.
- Prisma schema đúng ARCHITECTURE §4 (Brand, ProductLine, Collection, Material, Store, Product, StoreProductQty, AdminUser) và mọi ràng buộc §4.1; điều kiện "SP visible" §4.2; công thức thiếu/tỷ lệ §4.3 (tổng tính trên số tổng, CH ẩn không cộng).
- Test lib/metrics.ts phải có ví dụ ADR-007: CH A đặt 5 về 7, CH B đặt 5 về 3 → thiếu tổng 0, tỷ lệ 100%.
- T10.2: hướng dẫn tôi từng bước tạo/kết nối Vercel + Neon + Blob; không tự đăng nhập hay tạo tài khoản thay tôi.
```

### Phiên 2 — Đăng nhập quản trị
```
Thực hiện PHIÊN 2 trong docs/SESSIONS.md: T02.2–T02.8.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/*, docs/SESSIONS.md và features/F02. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅ trong TASKS.md. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- ADR-004: trang xem công khai, chỉ 1 tài khoản quản trị; requireAdmin() cho MỌI thao tác ghi và API cấp token upload Blob.
- Trang /login và /admin dùng giao diện quản trị trung tính (UI-DESIGN §8).
- robots.txt chặn toàn bộ + meta noindex (ADR-005 I6).
- Mật khẩu ban đầu: tạo bằng script, không ghi mật khẩu vào code hay chat.
```

### Phiên 3 — Trang xem: giao diện & danh mục
```
Thực hiện PHIÊN 3 trong docs/SESSIONS.md: T03.1–T03.14.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-007, ADR-009 kể cả các mục sửa đổi U2'–U18'), docs/SESSIONS.md và features/F03. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Bám sát mockup đã duyệt (link trong UI-DESIGN §9): banner nền docs/brand/tet-banner.png, chữ căn giữa; thanh "Cửa hàng của bạn" dính dưới banner; khu Bộ sưu tập; thẻ SP gọn ảnh to + thanh tiến độ; dạng Bảng; chân trang. Màu vàng #F2A900.
- Logo: dùng file trong docs/brand/ nếu đã có, chưa có thì để ô tạm "LOGO".
- Nhãn trạng thái 4 loại theo UI-DESIGN §4.
- Xong phần giao diện thì dừng cho tôi xem trên điện thoại và máy tính trước khi làm task cuối.
```

### Phiên 4 — Lọc, tìm, sắp xếp
```
Thực hiện PHIÊN 4 trong docs/SESSIONS.md: T04.2–T04.11.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-002 D6, ADR-003, ADR-007), docs/SESSIONS.md và features/F04. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Quy tắc B1–B9 trong features/F04: chọn nhiều (HOẶC trong một bộ lọc, VÀ giữa các bộ lọc), liên động theo nhãn, "Không thuộc BST", đếm số SP, cửa hàng chọn một + công tắc "Xem tất cả SP", tìm theo mã, 5 kiểu sắp xếp (mặc định Mã A→Z), mọi trạng thái trên URL.
- Giao diện bộ lọc dạng nút bấm/nút thả xuống như mockup (ADR-009 U8'); điện thoại là bảng trượt từ dưới.
- Đo hiệu năng bằng seed quy mô lớn (≤ 1 giây mỗi yêu cầu).
```

### Phiên 5 — Popup chi tiết & xuất Excel người xem
```
Thực hiện PHIÊN 5 trong docs/SESSIONS.md: T05.2–T05.6, T11.1–T11.3.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/*, docs/SESSIONS.md và features/F05, features/F11. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Popup như mockup: máy tính là cửa sổ giữa màn hình, điện thoại toàn màn hình; bảng SL theo từng cửa hàng + dòng TỔNG; tô dòng cửa hàng đang lọc; ?sp=MÃ trên URL; Back/Esc đóng và giữ bộ lọc.
- Xuất Excel dùng cùng tham số lọc/sắp xếp/phạm vi cửa hàng đang xem; ghi phạm vi + thời điểm xuất trong file.
```

### Phiên 6 — Quản trị danh mục
```
Thực hiện PHIÊN 6 trong docs/SESSIONS.md: T06.1–T06.6.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-003, ADR-008), docs/SESSIONS.md và features/F06. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- 5 danh mục: Nhãn, Dòng (thuộc nhãn), BST (thuộc nhãn), Chất liệu, Cửa hàng (mã duy nhất).
- Không xóa khi đang được dùng, chỉ ẩn; ẩn nhãn/dòng/BST/chất liệu thì SP thuộc nó ẩn theo; ẩn cửa hàng thì không cộng vào tổng. Trước khi ẩn phải báo số SP bị ảnh hưởng và hỏi xác nhận.
- Giao diện quản trị trung tính như mockup màn hình quản trị.
```

### Phiên 7 — Sản phẩm & tải ảnh hàng loạt
```
Thực hiện PHIÊN 7 trong docs/SESSIONS.md: T07.1–T07.9.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-005, ADR-006, ADR-008), docs/SESSIONS.md và features/F07. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Mã SP không sửa được; không xóa SP, chỉ ẩn; bắt buộc Mã, Nhãn, Dòng.
- 1 ảnh/SP, tên file = mã SP; tải lại cùng mã = thay ảnh cũ (xóa file cũ trên Blob).
- Ảnh thu nhỏ trên trình duyệt (≈1600px + thumbnail ≈400px, WEBP) rồi tải thẳng lên Vercel Blob (giới hạn 4,5 MB của Vercel); hỗ trợ chọn nhiều file và .zip (giải nén trên trình duyệt); có bước xem trước khớp / không khớp / SP chưa có ảnh.
```

### Phiên 8 — Nhập Excel, sửa SL, xuất Excel quản trị
```
Thực hiện PHIÊN 8 trong docs/SESSIONS.md: T08.2–T08.10, T11.4–T11.6.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-002, ADR-006, ADR-008), docs/SESSIONS.md và features/F08, features/F11. Làm lần lượt từng task; mỗi task: code + test, chạy lint/test, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Mẫu 2 sheet SanPham + SoLuong (mỗi cửa hàng 1 dòng) + sheet HuongDan, có danh sách chọn.
- Quy tắc R1–R15 trong features/F08: ghi đè; ô trống = giữ nguyên; về > đặt được phép; SP mới được tạo; cửa hàng/nhãn/dòng/BST/chất liệu chưa có → lỗi; còn lỗi thì khóa nút Áp dụng; áp dụng trong 1 transaction.
- Màn hình xem trước như mockup quản trị (thẻ tổng hợp, tab, lỗi ghi rõ sheet/dòng/cột/lý do, cũ → mới).
- File quản trị xuất ra phải nhập lại được ngay với 0 lỗi, 0 thay đổi (có test).
- Đo hiệu năng với 3.000 SP × 100 cửa hàng trên Vercel preview.
```

### Phiên 9 — Vận hành, dữ liệu thật, UAT, go-live
```
Thực hiện PHIÊN 9 trong docs/SESSIONS.md: T10.4–T10.10.
[CHUNG] Đọc trước: PROJECT.md, ARCHITECTURE.md, TASKS.md, docs/UI-DESIGN.md, docs/decisions/* (đặc biệt ADR-005), docs/SESSIONS.md và features/F10. Làm lần lượt từng task; mỗi task: thực hiện + kiểm tra, commit, đánh ✅. Không tự thêm quy tắc nghiệp vụ; chưa rõ thì hỏi. Không push/deploy production khi chưa được cho phép. Cuối phiên báo cáo.
Riêng phiên này:
- Kiểm tra trước: mọi task phiên 1–8 đã ✅; nếu chưa thì báo tôi, không làm thay.
- Sao lưu hằng ngày + diễn tập khôi phục thật; giám sát lỗi.
- Nhập dữ liệu thật theo thứ tự: cửa hàng → danh mục → Excel → ảnh; đối chiếu số liệu với file nguồn.
- Viết docs/user-guide.md cho người xem và quản trị; chuẩn bị checklist UAT.
- Checklist go-live T10.10: Vercel Pro, logo thật, ảnh banner đã ghi nguồn trong docs/brand/LICENSE.txt, tên miền, noindex, sao lưu. Hỏi tôi trước mọi bước trên production.
```
