# UI-DESIGN — Đặc tả giao diện

> Theo [ADR-009](decisions/ADR-009-ui-design.md). Mockup duyệt trước khi code (task T00.1–T00.3).

---

## 1. Nhận diện

| Mục | Giá trị |
|-----|---------|
| Tiêu đề | **Xuân Thần Tài 2027** (header + `<title>`) |
| Logo | `docs/brand/` — cần bản màu và bản **trắng** (đặt trên header đỏ). Định dạng SVG ưu tiên, hoặc PNG nền trong suốt ≥ 512px |
| Favicon | Tạo từ logo |
| Ngôn ngữ | Tiếng Việt; số `1.234`, giá `12.500.000 ₫`, phần trăm `75%` |
| Nền tối | Không |

## 2. Bảng màu (design tokens)

| Token | Mã | Dùng cho |
|-------|----|---------|
| `--bg` | `#FBF6EC` | Nền trang xem (kem) |
| `--surface` | `#FFFFFF` | Thẻ SP, popup, cột lọc |
| `--primary` | `#B3261E` | Header, liên kết, lựa chọn đang bật, viền focus |
| `--primary-fg` | `#FFFFFF` | Chữ/logo trên nền đỏ |
| `--accent` | `#F2A900` | Vàng cam (mai vàng): tiêu đề lớn trên banner đỏ, nút chính, thanh tiến độ, viền nhấn, họa tiết |
| `--accent-dark` | `#C77F00` | Viền đồng xu, nét đậm của họa tiết vàng |
| `--accent-soft` | `#FFF6E0` | Nền nhấn nhạt (tổng trong popup, dòng đang chọn) |
| `--primary-dark` | `#8E1B16` | Chân trang, đầu trang Phân tích |
| `--festive` | `#CC1208` | Đỏ Tết của ảnh banner: nền dự phòng phía sau ảnh banner |
| `--accent-fg` | `#2B1A12` | Chữ trên nút vàng |
| `--text` | `#2B1A12` | Chữ chính |
| `--text-muted` | `#6B5A4E` | Chữ phụ (nhãn, chú thích) |
| `--border` | `#E8DCC4` | Viền thẻ, đường chia |
| `--status-full` | `#2E7D4F` | Đủ hàng |
| `--status-short` | `#D9822B` | Còn thiếu |
| `--status-none` | `#7A7A7A` | Chưa về |
| `--status-noorder` | `#BDBDBD` | Không đặt |

**Quy tắc tương phản** (đạt WCAG AA cho chữ thường):
- Chữ vàng `#F2A900` trên nền đỏ **chỉ cho chữ lớn ≥ 24px** (tiêu đề banner, tên web); chữ nhỏ trên nền đỏ dùng trắng hoặc kem `#FFF3D6`. Không đặt chữ vàng trên nền kem/trắng. Nút vàng dùng chữ nâu đậm.
- Chữ trên header đỏ dùng **trắng**.
- Nhãn trạng thái: nền màu nhạt + chữ màu đậm cùng tông, luôn kèm chữ (không chỉ dựa vào màu).

Trang quản trị dùng nền `#F7F7F5`, bề mặt trắng, chữ `#1F2937`, điểm nhấn `--primary`.

## 3. Kiểu chữ

| Vai trò | Font | Cỡ (mobile / desktop) |
|---------|------|------------------------|
| Tiêu đề trang (header) | Playfair Display 700 | 22 / 28px |
| Tiêu đề popup, tên BST | Playfair Display 600 | 20 / 24px |
| Tên SP | Be Vietnam Pro 600 | 15 / 16px |
| Nội dung, nhãn | Be Vietnam Pro 400 | 14 / 15px |
| Mã SP | Be Vietnam Pro 500, chữ hoa | 13 / 14px |
| Số liệu | Be Vietnam Pro 600, `tabular-nums` | 14 / 15px |

Cả hai font tải từ Google Fonts qua `next/font` (tự host, hỗ trợ tiếng Việt).

## 4. Trạng thái hàng về (theo phạm vi đang xem: tổng hoặc 1 cửa hàng)

| Thứ tự kiểm tra | Điều kiện | Nhãn | Màu |
|-----------------|-----------|------|-----|
| 1 | Đặt = 0 | Không đặt | `--status-noorder` |
| 2 | Về = 0 | Chưa về | `--status-none` |
| 3 | Còn thiếu = 0 | Đủ hàng | `--status-full` |
| 4 | còn lại | Còn thiếu | `--status-short` |

Ví dụ: Đặt 120, Về 90 → "Còn thiếu" (cam); Đặt 5, Về 7 → "Đủ hàng".

## 5. Bố cục trang xem

> **Cập nhật sau mockup v1 (ADR-009 U2'–U16):** trang xem là **một trang web cuộn**, theo thứ tự:
> 1. **Banner Tết** đỏ: thanh điều hướng (logo, tên web, liên kết Bộ sưu tập / Sản phẩm) → nhãn "XUÂN ĐINH MÙI · 2027", tiêu đề "Xuân Thần Tài" cỡ 72px màu vàng cam, câu chúc in nghiêng, đoạn mô tả, **ô Cửa hàng của bạn + Tìm mã SP + nút Xem hàng**; bên phải cành mai + đồng xu; viền lượn vàng ở đáy.
> 2. ~~Bộ sưu tập mùa này~~ — đã bỏ (2026-11-03); lọc BST vẫn có trong hàng bộ lọc và hiện dải "Đang xem bộ sưu tập: X · N SP [Bỏ lọc ✕]".
> 3. **Tất cả sản phẩm**: một hàng nút thả xuống Nhãn hàng / Dòng / BST / Chất liệu / Khung giá, Sắp xếp, chuyển Lưới/Bảng, Xuất Excel → lưới thẻ gọn (4 cột máy tính, 2 cột điện thoại) → "Xem thêm".
> 4. **Chân trang** đỏ đậm, viền lượn vàng giống banner (ADR-009 U16''').
>
> Khi đã chọn cửa hàng hoặc cuộn xuống, thanh đầu trang thu gọn (logo, tên web, ô Cửa hàng, ô tìm) và dính trên cùng.
> Các sơ đồ 5.1–5.4 dưới đây là **phiên bản v1**, giữ lại để tham khảo; mockup v2 là chuẩn.

### 5.1 Máy tính (≥ 1024px)
```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER đỏ: [logo trắng]  Xuân Thần Tài 2027   (họa tiết mai/đồng xu nhẹ) │
├───────────────┬──────────────────────────────────────────────────┤
│ CỘT LỌC (280px)│ [🔍 Tìm mã SP]  Cửa hàng: [Tất cả ▾]  [☐ Xem tất cả SP] │
│               │ Phạm vi: Tổng hệ thống · 248 SP   Sắp xếp [Mã A→Z ▾] [▦ Lưới|☰ Bảng] [⬇ Xuất Excel] │
│ Nhãn hàng     │ chip đang lọc: [Nhãn A ✕] [Vàng 18K ✕]  Xóa lọc          │
│ ☐ Nhãn A (40) ├──────────────────────────────────────────────────┤
│ ☐ Nhãn B (32) │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│ Dòng hàng     │ │ thẻ  │ │ thẻ  │ │ thẻ  │ │ thẻ  │  (4 cột)      │
│ Bộ sưu tập    │ └──────┘ └──────┘ └──────┘ └──────┘               │
│ ☐ Không thuộc BST │ …                                               │
│ Chất liệu     │ [ Tải thêm ]                                       │
└───────────────┴──────────────────────────────────────────────────┘
```
- Cột lọc cố định khi cuộn (sticky), mỗi nhóm thu gọn được, nhóm >8 lựa chọn có ô tìm.
- Tablet (768–1023px): 3 cột; cột lọc thu thành ngăn kéo.

### 5.2 Điện thoại (< 768px)
```
┌──────────────────────────┐
│ HEADER đỏ: logo · Xuân Thần Tài 2027 │
├──────────────────────────┤
│ [🔍 Tìm mã SP          ] │
│ [⚙ Lọc (2)] [Cửa hàng ▾] [⇅] [▦/☰] │
│ Tổng hệ thống · 248 SP   │
├────────────┬─────────────┤
│   thẻ      │    thẻ      │  (2 cột)
└────────────┴─────────────┘
```
- "Lọc" mở ngăn kéo toàn màn hình, nút "Xem 248 kết quả" cố định ở đáy.
- Nút Xuất Excel nằm trong menu ⋯.

### 5.3 Thẻ sản phẩm (dạng Lưới)
```
┌────────────────────────┐
│   [ ẢNH vuông 1:1 ]    │  nền trắng, object-fit: contain
│            [Còn thiếu] │  ← nhãn trạng thái góc ảnh
├────────────────────────┤
│ NTT001                 │  mã (muted)
│ Nhẫn Kim Tiền          │  tên (tối đa 2 dòng)
│ Vàng 18K · 12.500.000 ₫│
│ Đặt │ Về │ Thiếu │  %  │  bảng số nhỏ
│ 120 │ 90 │  30   │ 75% │
└────────────────────────┘
```
Viền `--border`, bo góc 12px; hover (máy tính): nổi nhẹ + viền vàng. Bấm cả thẻ → popup.

### 5.4 Dạng Bảng
| Ảnh (48px) | Mã SP | Tên | Nhãn | Dòng | BST | Chất liệu | Giá | Đặt | Về | Thiếu | % | Trạng thái |
- Máy tính: đủ cột, tiêu đề cố định khi cuộn.
- Điện thoại: ẩn Nhãn/Dòng/BST/Chất liệu; cuộn ngang trong bảng (không cuộn ngang cả trang).
- Lựa chọn Lưới/Bảng ghi lên URL (`view=list`) *(mặc định kỹ thuật)*.

### 5.5 Popup chi tiết
```
┌──────────────────────────────────────────────┐
│ Nhẫn Kim Tiền                             ✕  │
├───────────────────┬──────────────────────────┤
│                   │ NTT001                   │
│   [ ẢNH LỚN ]     │ Nhãn A · Nhẫn · BST Phúc Lộc │
│                   │ Vàng 18K                 │
│                   │ 12.500.000 ₫             │
│                   │ Tổng: Đặt 120 · Về 90 · Thiếu 30 · 75% [Còn thiếu] │
├───────────────────┴──────────────────────────┤
│ Cửa hàng          │ Đặt │ Về │ Thiếu │ %  │ TT │
│ CH01 Quận 1       │ 20  │ 20 │  0    │100%│ Đủ │  ← dòng CH đang lọc tô nền vàng nhạt
│ …                 │     │    │       │    │    │
│ TỔNG              │ 120 │ 90 │ 30    │ 75%│    │
└──────────────────────────────────────────────┘
```
Điện thoại: toàn màn hình, ảnh trên, thông tin dưới, bảng cửa hàng cuộn dọc.

### 5.6 Họa tiết Tết
- Chỉ ở header: dải họa tiết mai/đồng xu Thần Tài mờ (opacity ~15%) bên phải, đường viền vàng kim mảnh dưới header.
- Ảnh SVG nhẹ (< 20 KB), không dùng ảnh động.

## 6. Trạng thái giao diện
| Trạng thái | Hiển thị |
|-----------|----------|
| Đang tải | Skeleton thẻ |
| Không có SP | Minh họa nhỏ + "Không có sản phẩm phù hợp" + nút Xóa lọc |
| Lỗi | Thông báo + nút Thử lại |
| SP chưa có ảnh | Ảnh thay thế: nền kem + logo mờ |
| Trường trống | "—" |

## 7. Khả năng truy cập
- Tương phản AA; vùng chạm ≥ 44px trên điện thoại; focus nhìn thấy được (viền đỏ).
- Popup: khóa focus bên trong, Esc đóng, có `aria-label`.
- Trạng thái luôn có chữ, không chỉ màu.

## 8. Trang quản trị
- Nền `#F7F7F5`, sidebar trái trắng với các mục: Danh mục · Sản phẩm · Ảnh · Nhập Excel · Số lượng · Xuất dữ liệu · Tài khoản.
- Header nhỏ có logo + "Quản trị". Font Be Vietnam Pro toàn bộ.
- Bảng dày đặc thông tin, nút chính màu `--primary`; thông báo thành công/lỗi dạng toast.
- Màn hình xem trước import: thẻ tổng hợp (SP mới / thay đổi / lỗi) + bảng chi tiết có tab lọc theo loại; lỗi tô đỏ nhạt.

## 9. Mockup cần duyệt (T00)
1. Danh mục — Lưới, máy tính và điện thoại.
2. Danh mục — Bảng, máy tính và điện thoại.
3. Ngăn kéo lọc (điện thoại) + cột lọc (máy tính).
4. Popup chi tiết, máy tính và điện thoại.
5. Một màn hình quản trị đại diện: xem trước nhập Excel.

Mockup là trang HTML tĩnh dùng dữ liệu giả, logo thật (nếu đã có).

**Bản mockup v1 (2026-10-30):** https://claude.ai/artifact/QxGARukK9ciCcZ9PHuUXwG — 7 bảng: Máy tính Lưới (bấm được: mở chi tiết, chuyển Bảng), Máy tính Bảng lọc theo Cửa hàng 05, Máy tính popup chi tiết, Điện thoại Lưới / Bộ lọc / Chi tiết, Quản trị xem trước nhập Excel. Logo đang là ô tạm "LOGO".

**Bản mockup v2 (2026-10-30, cùng link):** làm lại theo góp ý "giống báo cáo" — banner Tết lớn, khu bộ sưu tập, bộ lọc dạng nút bấm, thẻ SP gọn ảnh to, vàng cam `#F2A900`, chân trang. Điện thoại: trang chủ cuộn toàn trang + bảng lọc trượt từ dưới. 

**Bản mockup v3 (2026-10-30, cùng link):** ô chọn cửa hàng chuyển xuống **thanh "Cửa hàng của bạn" dính dưới banner** (ADR-009 U14'); bỏ hình mai/đồng xu tự vẽ, thay bằng **ô chờ ảnh trang trí Tết** do chủ dự án cung cấp (U17, xem `docs/brand/README.md`). Cập nhật: banner dùng **tạm ảnh tranh Tết (dê, mây lành, hoa) do chủ dự án gửi** làm nền toàn banner, chữ căn giữa (ADR-009 U18). Sau đó thay bằng ảnh chính thức chủ dự án gửi (`docs/brand/tet-banner.png`, ADR-009 U18').

✅ **Mockup đã được chủ dự án duyệt ngày 2026-10-30 (T00.3).** Đây là chuẩn giao diện để code.

**Mockup dựng lại (2026-11-02):** bản artifact gốc không còn truy cập được, nên mockup được viết lại thành file tĩnh [docs/mockups/index.html](mockups/index.html) (mở trực tiếp trong trình duyệt): 8 bảng — máy tính Lưới / Bảng lọc cửa hàng / popup chi tiết, điện thoại trang chủ / bảng lọc / chi tiết / Bảng, quản trị xem trước nhập Excel. Màn xem công khai khớp giao diện đã code ở phiên 3; bộ lọc, popup và quản trị là bản dựng theo mô tả ở trên, chưa code.
