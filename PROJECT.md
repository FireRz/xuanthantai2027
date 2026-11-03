# PROJECT — Website Bộ Sưu Tập Trang Sức Xuân Thần Tài

> Trạng thái: **DỰ ÁN HOÀN THÀNH (2026-11-03)** — chủ dự án bỏ T10.7, T10.9, T10.10; tinh chỉnh sau khi test trên production làm ở các phiên sau
> Tài liệu liên quan: [ARCHITECTURE.md](ARCHITECTURE.md) · [TASKS.md](TASKS.md) · [features/](features/) · [docs/decisions/](docs/decisions/) · [docs/UI-DESIGN.md](docs/UI-DESIGN.md)

---

## 1. Bối cảnh & mục tiêu

### 1.1 Bối cảnh
Hệ thống cửa hàng cần một nơi tập trung để xem các bộ sưu tập trang sức mùa **Xuân Thần Tài**: sản phẩm trông như thế nào, mã gì, giá bao nhiêu, mỗi cửa hàng đã đặt bao nhiêu, đã về bao nhiêu, còn thiếu bao nhiêu.

### 1.2 Mục tiêu
| # | Mục tiêu | Nguồn |
|---|----------|-------|
| G1 | Hiển thị các bộ sưu tập trang sức mùa Xuân Thần Tài cho hệ thống cửa hàng | Yêu cầu 1 |
| G2 | Xem được hình ảnh, mã SP, SL đặt hàng, SL đã về (+ tên, chất liệu, giá, còn thiếu, tỷ lệ về) | Yêu cầu 2 + Q-03, Q-10 |
| G3 | Lọc theo nhãn hàng, dòng hàng, bộ sưu tập (+ chất liệu, cửa hàng) | Yêu cầu 3 + bổ sung |
| G4 | Cập nhật dữ liệu hàng hóa và số lượng bằng file Excel | Yêu cầu 4 + Q-08 |

### 1.3 Thời hạn
Go-live **trong 6–8 tuần** (Q-21) → mục tiêu **2026-12-18**, hạn chót **2026-12-25**.

---

## 2. Phân tích nghiệp vụ

### 2.1 Tác nhân
| Actor | Mô tả |
|-------|-------|
| **Người xem (cửa hàng)** | Bất kỳ ai có link; **chỉ xem** và xuất Excel danh sách đang lọc; không đăng nhập (Q-05, Q-13) |
| **Quản trị (chủ dự án)** | **Người duy nhất** cập nhật dữ liệu (Q-06) |

### 2.2 Thực thể nghiệp vụ
| Thực thể | Thuộc tính | Ghi chú |
|----------|-----------|---------|
| Sản phẩm | Mã (duy nhất, không sửa), Tên, 1 Ảnh, Giá bán lẻ (VND), Chất liệu | Thuộc 1 nhãn, 1 dòng, 0–1 BST |
| Nhãn hàng | Tên | Có nhiều Dòng và nhiều BST |
| Dòng hàng | Tên | Thuộc 1 nhãn |
| Bộ sưu tập | Tên | Thuộc 1 nhãn; có thể gồm nhiều dòng |
| Chất liệu / tuổi vàng | Tên | Danh mục cố định, dùng để lọc |
| Cửa hàng | Mã, Tên | Quản trị tự nhập trên web |
| Số lượng | SL đặt, SL đã về | Theo (SP, cửa hàng); tổng tự tính |

### 2.3 Luồng nghiệp vụ
1. **Xem**: mở web → danh sách SP (ảnh, mã, tên, chất liệu, giá, SL đặt/về/thiếu/tỷ lệ tổng).
2. **Lọc / tìm / sắp xếp**: nhãn, dòng, BST, chất liệu, cửa hàng; tìm theo mã; chọn kiểu sắp xếp.
3. **Xem chi tiết**: bấm SP → cửa sổ nổi với ảnh lớn và bảng SL theo từng cửa hàng.
4. **Xuất Excel**: người xem xuất danh sách đang lọc.
5. **Cập nhật** (quản trị): tạo danh mục & cửa hàng trên web → tải mẫu Excel → điền → nhập file (xem trước → xác nhận) → tải ảnh hàng loạt (tên file = mã SP). Xuất dữ liệu hiện tại theo mẫu để sửa và nhập lại.

### 2.4 Quy tắc nghiệp vụ đã chốt
| ID | Quy tắc | Nguồn |
|----|---------|-------|
| BR-01 | SL đặt và SL đã về lưu theo từng cửa hàng cho từng SP | Q-01 |
| BR-02 | SL tổng = tổng các cửa hàng, tự tính | Bổ sung |
| BR-03 | SL đã về là một con số (không theo đợt) | Q-02 |
| BR-04 | Cập nhật SL là ghi đè | Q-22 |
| BR-05 | Dòng thuộc 1 nhãn; BST thuộc 1 nhãn, có thể gồm nhiều dòng | Q-04 |
| BR-06 | SP: đúng 1 nhãn, 1 dòng, 0–1 BST; dòng và BST cùng nhãn với SP | Q-04 |
| BR-07 | Mã SP duy nhất, không biến thể, không sửa sau khi tạo | Q-09, bổ sung |
| BR-08 | Trang xem công khai, chặn công cụ tìm kiếm; chỉ 1 quản trị | Q-05, Q-06, Q-26 |
| BR-09 | Người xem thấy SL tổng + chi tiết mọi cửa hàng | Bổ sung |
| BR-10 | Cập nhật bằng file Excel (2 sheet; SL mỗi cửa hàng 1 dòng) | Q-08, Q-27 |
| BR-11 | Lọc theo cửa hàng X: mặc định chỉ SP X có đặt > 0; công tắc xem tất cả | Q-24 |
| BR-12 | Cửa hàng, nhãn, dòng, BST, chất liệu chưa có trong file → báo lỗi; SP mới được tạo | Q-25, R5b |
| BR-13 | Ảnh tải riêng, 1 ảnh/SP, tên file = mã SP | Q-27, Q-11 |
| BR-14 | Còn thiếu (1 CH) = max(Đặt − Về, 0); tổng tính trên số tổng: max(ΣĐặt − ΣVề, 0) | Q-03 |
| BR-15 | Tỷ lệ về = min(Về/Đặt, 100%); Đặt = 0 → "—" | Q-03 |
| BR-16 | SL về > SL đặt được phép | Q-07 |
| BR-17 | Ô trống trong file = giữ nguyên | R6 |
| BR-18 | Không xóa, chỉ ẩn; ẩn nhãn/dòng/BST/chất liệu → SP thuộc nó ẩn theo | Q-23, bổ sung |
| BR-19 | Giá bán lẻ công khai, một giá mỗi SP | Bổ sung |
| BR-20 | Chỉ một mùa; không lưu lịch sử thay đổi | Q-16, Q-17 |

Chi tiết: [ADR-002](docs/decisions/ADR-002-quantity-model.md), [ADR-003](docs/decisions/ADR-003-classification.md), [ADR-004](docs/decisions/ADR-004-auth.md), [ADR-006](docs/decisions/ADR-006-import-and-images.md), [ADR-007](docs/decisions/ADR-007-display-filter-sort.md), [ADR-008](docs/decisions/ADR-008-product-data-rules.md).

---

## 3. Phạm vi

### 3.1 Trong phạm vi
- Trang danh mục công khai: ảnh, mã, tên, chất liệu, giá, SL đặt/về/thiếu/tỷ lệ (tổng hoặc theo cửa hàng), nhãn trạng thái màu; chuyển Lưới / Bảng.
- Giao diện tông Đỏ – vàng Tết, logo công ty, tiêu đề "Xuân Thần Tài 2027"; mockup duyệt trước khi code ([UI-DESIGN](docs/UI-DESIGN.md)).
- Bộ lọc chọn nhiều (nhãn, dòng, BST + "Không thuộc BST", chất liệu) có đếm số SP; lọc 1 cửa hàng + công tắc "Xem tất cả SP".
- Tìm theo mã SP; 5 kiểu sắp xếp (mặc định Mã A→Z).
- Cửa sổ nổi chi tiết SP với bảng SL theo cửa hàng.
- Xuất Excel: người xem (danh sách đang lọc), quản trị (toàn bộ theo mẫu nhập).
- Khu vực quản trị (1 tài khoản): danh mục (nhãn, dòng, BST, chất liệu, cửa hàng), sản phẩm, ảnh hàng loạt, nhập Excel, sửa nhanh SL.
- Triển khai trên Vercel (Neon + Blob), chặn công cụ tìm kiếm.

### 3.2 Ngoài phạm vi
- Bán hàng, giỏ hàng, thanh toán; cửa hàng đặt hàng/ghi chú qua web (Q-13).
- Nhiều tài khoản / phân quyền theo cửa hàng (Q-06).
- Ghi hàng về theo đợt (Q-02); biến thể SP (Q-09); nhiều ảnh/SP (Q-11).
- Nhiều mùa (Q-16); lịch sử thay đổi / audit log (Q-17).
- Tích hợp ERP/POS; ứng dụng di động native; đa ngôn ngữ.
- Xóa vĩnh viễn dữ liệu (Q-23).

---

## 4. Danh sách Feature

| ID | Feature | Ưu tiên | File |
|----|---------|---------|------|
| F01 | Nền tảng dự án & mô hình dữ liệu | Must | [F01](features/F01-foundation-data-model.md) |
| F02 | Đăng nhập quản trị | Must | [F02](features/F02-auth-permissions.md) |
| F03 | Danh mục sản phẩm (xem công khai) | Must | [F03](features/F03-product-catalog.md) |
| F04 | Bộ lọc, tìm kiếm, sắp xếp | Must | [F04](features/F04-filters.md) |
| F05 | Chi tiết sản phẩm (cửa sổ nổi) | Must | [F05](features/F05-product-detail.md) |
| F06 | Quản lý Nhãn/Dòng/BST/Chất liệu/Cửa hàng | Must | [F06](features/F06-master-data.md) |
| F07 | Quản lý sản phẩm & ảnh | Must | [F07](features/F07-product-management.md) |
| F08 | Nhập Excel & cập nhật số lượng | Must | [F08](features/F08-quantity-update.md) |
| ~~F09~~ | ~~Lịch sử thay đổi~~ | ✂️ Bỏ (Q-17) | [F09](features/F09-audit-log.md) |
| F10 | Triển khai, vận hành & nghiệm thu | Must | [F10](features/F10-deployment-ops.md) |
| F11 | Xuất Excel | Must | [F11](features/F11-export.md) |

---

## 5. Câu hỏi đã xác nhận (2026-10-30)

| ID | Câu hỏi | Trả lời | ADR |
|----|---------|---------|-----|
| Q-01 | SL toàn hệ thống hay theo cửa hàng? | Cả hai: lưu theo CH, tổng = cộng | 002 |
| Q-02 | Hàng về theo đợt? | Một con số | 002 |
| Q-03 | Còn thiếu / tỷ lệ? | Cả hai; tổng tính trên số tổng | 007 |
| Q-04 | Quan hệ Nhãn–Dòng–BST? | Dòng ⊂ Nhãn, BST ⊂ Nhãn; SP 1 nhãn, 1 dòng, 0–1 BST | 003 |
| Q-05 | Đăng nhập để xem? | Không | 004 |
| Q-06 | Ai cập nhật? | Chỉ chủ dự án | 004 |
| Q-07 | Về > Đặt? | Cho phép, thiếu = 0 | 002, 007 |
| Q-08 | Nguồn dữ liệu? | Excel, tải file lên | 006 |
| Q-09 | Mã SP? | Duy nhất, không biến thể | 003 |
| Q-10 | Thêm trường? | Tên, Chất liệu (danh mục + lọc), Giá bán lẻ công khai | 007, 008 |
| Q-11 | Số ảnh? | 1 ảnh/SP | 008 |
| Q-12 | Quy mô? | Vừa: 500–3.000 SP, 20–100 cửa hàng | 005 |
| Q-13 | Cửa hàng thao tác gì? | Chỉ xem | 007 |
| Q-14 | Tìm kiếm? | Theo mã SP | 007 |
| Q-15 | Trang chi tiết? | Cửa sổ nổi | 007 |
| Q-16 | Nhiều mùa? | Chỉ mùa này | 008 |
| Q-17 | Lịch sử thay đổi? | Không cần | 008 |
| Q-18 | Xuất Excel? | Cả người xem và quản trị | 007 |
| Q-19 | Thiết bị? | Điện thoại và máy tính như nhau | 007 |
| Q-20 | Hosting? | Vercel (Neon + Blob); Hobby khi thử, Pro trước go-live | 005 |
| Q-21 | Thời hạn? | 6–8 tuần | 005 |
| Q-22 | Ghi đè / cộng dồn? | Ghi đè | 002 |
| Q-23 | Xóa SP? | Chỉ ẩn | 008 |
| Q-24 | Lọc cửa hàng hiện SP nào? | Mặc định SP có đặt > 0, công tắc xem tất cả | 002 |
| Q-25 | Danh sách cửa hàng? | Nhập trên web | 002 |
| Q-26 | Chặn Google? | Chặn | 005 |
| Q-27 | Excel & ảnh? | Ảnh riêng theo mã; SL mỗi CH 1 dòng | 006 |
| — | Chọn nhiều trong bộ lọc? | Có | 007 |
| — | "Không thuộc BST"? | Có | 007 |
| — | Đếm số SP cạnh lựa chọn? | Có | 007 |
| — | Sắp xếp? | Người xem chọn: Mã A→Z (mặc định), Mới cập nhật, Giá, Còn thiếu | 007 |
| — | Ô trống trong Excel? | Giữ nguyên | 008 |
| — | Nhãn/Dòng/BST chưa có trong Excel? | Báo lỗi | 008 |
| — | Sửa mã SP? | Không | 008 |
| — | Ẩn nhãn/dòng/BST → SP? | Ẩn theo | 008 |
| — | Nhận diện | Có logo (đặt vào `docs/brand/`), chưa có bộ màu | 009 |
| — | Màu sắc | Đỏ – vàng Tết (kem, đỏ son, vàng kim, nâu đậm) | 009 |
| — | Phong cách / họa tiết | Cân bằng ảnh & số; họa tiết Tết nhẹ chỉ ở header | 009 |
| — | Thẻ SP | Bảng số nhỏ Đặt · Về · Thiếu · %; 4 trạng thái màu | 009 |
| — | Bố cục | Lưới (ĐT 2, máy tính 4 cột) mặc định, chuyển được sang Bảng; lọc cột trái | 009 |
| — | Font | Playfair Display (tiêu đề) + Be Vietnam Pro | 009 |
| — | Quản trị | Giao diện trung tính, gọn | 009 |
| — | Tên web / nền tối | "Xuân Thần Tài 2027" / không | 009 |
| — | Mockup | Có, duyệt trước khi code giao diện | 009 |

**Mặc định kỹ thuật** (không phải quy tắc nghiệp vụ, có thể đổi khi chủ dự án yêu cầu): trường bắt buộc khi tạo SP là Mã, Nhãn, Dòng; tên dòng/BST duy nhất trong nhãn; không đổi nhãn của dòng/BST đã có SP; bộ lọc cửa hàng chọn một; ảnh lưu dạng WEBP. Xem ADR-007, ADR-008.

**Việc chủ dự án cần làm:** đặt logo (bản màu + bản trắng) vào `docs/brand/` trước khi làm mockup; **duyệt mockup**; tạo tài khoản Vercel; nâng Vercel Pro và chọn tên miền trước go-live.

---

## 6. Lộ trình (Milestones)

| Milestone | Nội dung | Thời gian dự kiến |
|-----------|----------|-------------------|
| M0 — Chốt yêu cầu | ✅ Hoàn tất | 2026-10-30 |
| M1 — Nền tảng + Mockup | F01, F02, môi trường Vercel preview; **mockup UI được duyệt** | Tuần 1 (đến 2026-11-06) |
| M2 — Xem & lọc | F03, F04, F05, F11 (người xem) | Tuần 2–3 |
| M3 — Cập nhật dữ liệu | F06, F07, F08, F11 (quản trị) | Tuần 3–5 |
| M4 — Hoàn thiện | Nhập dữ liệu thật, UAT, Vercel Pro, go-live | Tuần 6–7 (go-live ~2026-12-18) |
| Dự phòng | | Tuần 8 (đến 2026-12-25) |

---

## 7. Tiêu chí nghiệm thu tổng thể
1. Tất cả acceptance criteria của các Feature Must đạt.
2. Người dùng cửa hàng hoàn thành UAT trên **điện thoại và máy tính**: xem, lọc (gồm cửa hàng), tìm mã, sắp xếp, xem chi tiết, xuất Excel.
3. Quản trị hoàn thành UAT: tạo danh mục & cửa hàng, tải mẫu, nhập Excel, tải ảnh hàng loạt, xuất dữ liệu và nhập lại không lỗi.
4. Số liệu (tổng, còn thiếu, tỷ lệ) khớp công thức BR-14, BR-15 trên bộ dữ liệu kiểm thử.
5. Có hướng dẫn ngắn cho người xem và quản trị.
6. Có sao lưu CSDL và đã thử khôi phục.
7. Production chạy trên Vercel Pro, trang xem không bị công cụ tìm kiếm lập chỉ mục.
