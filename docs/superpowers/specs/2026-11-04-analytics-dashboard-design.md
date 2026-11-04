# Trang phân tích (`/phan-tich`) — Thiết kế

- **Ngày:** 2026-11-04
- **Trạng thái:** Đã duyệt khi trao đổi; chờ chủ dự án duyệt bản viết
- **Liên quan:** ADR-002 (mô hình số lượng), ADR-004 (truy cập), ADR-007 (lọc/sắp xếp), ADR-010 (khung giá), ADR-011 (chế độ chỉ xem hình)

## 1. Mục đích

Chủ dự án cần theo dõi **hiệu quả tổng thể** của các BST Xuân Thần Tài theo bộ lọc. Ví dụ: nhãn Gold có bao nhiêu mã, hàng đã về bao nhiêu %, đã bán bao nhiêu %. Câu hỏi chính có hai loại:

1. **Tổng của bộ lọc đang chọn:** một nhóm SP đang ở mức nào.
2. **So sánh các nhóm:** nhãn, dòng, BST… nào đang tốt, nào đang kém.

**Thành công khi:** người có mật khẩu mở `/phan-tich`, chọn bộ lọc và đọc được ngay các số tổng, phân bố trạng thái, bảng so sánh theo nhóm và top mã. Mọi con số phải khớp với số cộng từ danh mục khi dùng cùng bộ lọc.

## 2. Phạm vi

**Có:**
- Cổng mật khẩu xem chung.
- Bộ lọc giống danh mục.
- Ô số tổng và thanh tỷ lệ.
- Thanh số mã theo trạng thái (chỉ hiện số).
- Bảng so sánh theo một chiều nhóm chọn được.
- Top 10 bán chạy và top 10 còn thiếu.
- Mục quản lý mật khẩu xem trong admin.

**Không (bản này):**
- Doanh thu hoặc giá trị theo đồng (chủ dự án bỏ).
- Lịch sử theo thời gian. Chỉ có số hiện tại; dữ liệu vẫn ghi đè theo ADR-002 D4.
- Bấm trạng thái để mở danh mục đã lọc. Danh mục cũng chưa có bộ lọc trạng thái.
- Xuất Excel của dashboard.
- Tài khoản riêng cho từng người xem.

## 3. Truy cập — mật khẩu xem chung

| # | Quy định |
|---|----------|
| P1 | Trang `/phan-tich` (và mọi dữ liệu của nó) chỉ hiện khi có cookie xem hợp lệ **hoặc** đang đăng nhập admin. |
| P2 | Chưa có cookie: hiện form "Mật khẩu xem phân tích", gồm một ô mật khẩu và nút **Xem**, theo giao diện PNJ như trang đăng nhập. |
| P3 | Mật khẩu lưu dạng băm, dùng cùng hàm băm và kiểm tra với mật khẩu admin (`src/lib/password.ts`). Mật khẩu phải đạt cùng quy tắc độ dài như `assertPasswordPolicy`. |
| P4 | Nhập sai liên tiếp `MAX_FAILED_ATTEMPTS` (5) lần thì khóa `LOCK_WINDOW_MS` (15 phút), giống đăng nhập admin. Bộ đếm sai đếm chung cho mật khẩu xem (không theo từng IP), vì chỉ có một mật khẩu. Rủi ro đã chấp nhận: ai đó cố tình nhập sai có thể làm mọi người phải chờ 15 phút; người đã có cookie và admin không bị ảnh hưởng. |
| P5 | Nhập đúng thì đặt cookie `xtt_view` ký HMAC bằng `AUTH_SECRET`, `HttpOnly`, `Secure` (production), `SameSite=Lax`, hết hạn sau **30 ngày**. Nội dung cookie gồm phiên bản mật khẩu và thời điểm hết hạn. |
| P6 | Đổi mật khẩu thì tăng **phiên bản**. Mọi cookie mang phiên bản cũ hết hiệu lực, người xem phải nhập lại. |
| P7 | Chưa đặt mật khẩu: trang hiện "Trang phân tích chưa mở" và không có form. Admin đã đăng nhập vẫn vào được. |
| P8 | Admin đặt hoặc đổi mật khẩu ở mục **"Mật khẩu xem phân tích"** trong `/admin/account`. Có nút "Tắt trang phân tích" để xóa mật khẩu, khi đó trang quay về trạng thái P7. |
| P9 | `noindex` như mọi trang (ADR-005 I6). Lối vào: link "Phân tích" trong menu admin và link nhỏ "Phân tích" ở chân trang danh mục. |
| P10 | Đây là cổng gom số tổng hợp, **không** phải bảo mật dữ liệu: danh mục công khai vẫn hiện số lượng (ADR-004 A1). Điều này ghi vào ADR-012. |

**Dữ liệu:** bảng mới `app_setting(key TEXT PK, value TEXT, updated_at)`. Hai khóa:
- `viewer_password_hash`: chuỗi băm, hoặc không có dòng nào nếu chưa đặt;
- `viewer_password_version`: số nguyên dạng chuỗi.

Bộ đếm sai và thời điểm khóa lưu vào hai khóa `viewer_failed_count` và `viewer_locked_until`.

## 4. Bộ lọc

- Dùng **đúng** tham số URL và cách đọc của danh mục (`parseCatalogParams`): `brand`, `line`, `col`, `mat`, `typ`, `pr`, `store`, `all`, `q`. Các tham số `sort`, `view`, `sp`, `n`, `xem` bị bỏ qua, riêng `sp` vẫn dùng để mở popup SP.
- Giao diện dùng lại thanh lọc của danh mục (`FilterSection`). Ô cửa hàng và ô tìm mã đặt trên một thanh đơn giản ở đầu trang. Trang này **không** có công tắc "Chỉ xem hình".
- Phạm vi số liệu theo cửa hàng giống danh mục (ADR-002 D6):
  - không chọn cửa hàng: tổng các cửa hàng đang hiện;
  - chọn cửa hàng X: số của X, mặc định chỉ tính SP mà X có đặt > 0; khi `all=1` thì tính mọi SP.
- Tập SP được tính = đúng tập SP mà danh mục liệt kê với cùng bộ lọc.

## 5. Các khối trên trang

Thứ tự từ trên xuống:

### 5.1 Số tổng của bộ lọc
- 6 ô số: **Số mã**, **Đặt**, **Về**, **Thiếu**, **Bán**, **Tồn**.
- 2 thanh tỷ lệ: **% hàng về** và **% bán**.
- Công thức (tính trên tổng của tập SP, không lấy trung bình tỷ lệ từng mã):
  - Đặt, Về, Bán, Tồn = tổng theo phạm vi ở §4;
  - Thiếu = Σ `shortage` của từng SP (`max(Đặt−Về, 0)` của từng SP), khớp với cột Thiếu của danh mục;
  - % hàng về = `min(ΣVề / ΣĐặt, 1)`; nếu ΣĐặt = 0 thì "—";
  - % bán = `ΣBán / (ΣBán + ΣTồn)`, theo `sellThrough`; nếu mẫu số bằng 0 thì "—".

### 5.2 Mã theo trạng thái
- Một thanh chia theo 4 trạng thái **không chồng nhau** của `stockStatus` (theo phạm vi đang xem): Đủ hàng, Còn thiếu, Chưa về, Không đặt. Mỗi đoạn có số mã và chú thích; màu theo token trạng thái hiện có.
- Ô riêng **"Hết hàng: N mã"**: SP có Về > 0 và Tồn = 0, giống quy tắc tô đỏ ở thẻ SP.
- Chỉ hiện số, không bấm được.

### 5.3 So sánh theo nhóm
- Chọn chiều nhóm: **Nhãn** (mặc định), Dòng, BST, Tuổi vàng, Chủng loại, Khung giá, Cửa hàng. Chiều đang chọn ghi lên URL `?nhom=brand|line|col|mat|typ|pr|store`; giá trị lạ thì về `brand`.
- Mỗi dòng là một giá trị của chiều nhóm có ít nhất 1 SP trong tập. Cột: Tên, Số mã, Đặt, Về, % về (kèm thanh nhỏ), Bán, Tồn, % bán (kèm thanh nhỏ). Công thức giống §5.1, áp cho từng nhóm.
- Giá trị rỗng của chiều nhóm (SP không thuộc BST, chưa có tuổi vàng, chưa có chủng loại, ngoài mọi khung giá) gộp vào một dòng, tên lần lượt "Ngoài bộ sưu tập", "Chưa có tuổi vàng", "Chưa có chủng loại", "Ngoài khung giá".
- **Chiều Cửa hàng:** mỗi dòng là một cửa hàng đang hiện. Số mã = số SP trong tập mà cửa hàng đó có đặt > 0; các số khác là số của cửa hàng đó. Nếu bộ lọc đã chọn cửa hàng thì chỉ còn dòng của cửa hàng đó.
- Dòng tổng ở cuối bảng bằng §5.1. Riêng chiều Cửa hàng, khi không chọn cửa hàng, dòng tổng vẫn bằng §5.1 vì tổng các cửa hàng đang hiện bằng số tổng hệ thống (ADR-002 D2).
- Sắp xếp: mặc định theo Số mã giảm dần. Bấm tiêu đề cột để sắp theo cột đó (bấm lại thì đảo chiều); sắp xếp làm phía client, không ghi URL.
- Bấm tên nhóm thì thêm giá trị đó vào bộ lọc tương ứng (đi sâu vào nhóm) và giữ nguyên chiều nhóm. Dòng "rỗng" của BST thêm `col=none`; các dòng "rỗng" khác không bấm được vì danh mục chưa có bộ lọc tương ứng.
- Điện thoại (< 768px): bảng chỉ hiện Tên, % về, % bán. Bấm dòng thì mở rộng ngay dưới dòng đó để xem đủ số. Không cuộn ngang cả trang.

### 5.4 Top 10
- **Bán chạy nhất:** 10 SP có Bán lớn nhất trong tập (Bán > 0), hòa thì theo mã A→Z. Mỗi dòng có ảnh nhỏ, mã, tên và số bán.
- **Còn thiếu nhiều nhất:** 10 SP có Thiếu lớn nhất (Thiếu > 0), hòa thì theo mã A→Z. Mỗi dòng có ảnh nhỏ, mã, tên và số thiếu.
- Bấm một dòng thì mở popup chi tiết SP (`?sp=`) như danh mục, gồm cả phóng to ảnh và vuốt trước/sau (thứ tự trước/sau theo danh mục, sắp Mã A→Z).
- Không có SP nào thỏa thì hiện "Chưa có mã bán" hoặc "Không có mã thiếu".

### 5.5 Trạng thái trống và lỗi
- Bộ lọc ra 0 SP: thay toàn bộ các khối bằng "Không có sản phẩm phù hợp" kèm nút **Xóa lọc**, giữ `nhom`.
- Lỗi truy vấn: dùng trang lỗi chung của nhóm `(public)` như danh mục.

## 6. Kiến trúc

| Đơn vị | Trách nhiệm |
|--------|-------------|
| `src/server/services/analytics.ts` | `getAnalyticsSummary(params)`: tính §5.1 và §5.2. `getGroupBreakdown(params, dim)`: tính §5.3. `getTopProducts(params, kind, limit)`: tính §5.4. Cả ba dùng `catalogFromSql` (`catalog.ts`) để có đúng tập SP và phạm vi; trả về số thô, không định dạng. |
| `src/lib/analytics-params.ts` | Đọc và ghi `nhom` (`GroupDim`), kiểu `GroupDim = "brand" \| "line" \| "col" \| "mat" \| "typ" \| "pr" \| "store"`. |
| `src/server/auth/viewer-pass.ts` | Đặt, xóa, kiểm tra mật khẩu (P3, P4, P6); ký và kiểm cookie (P5); `hasViewerAccess()` trả true khi cookie hợp lệ hoặc là admin. |
| `prisma/migrations/*_app_setting` + model `AppSetting` | Bảng cấu hình ở §3. |
| `src/app/(public)/phan-tich/page.tsx` | Gọi `hasViewerAccess()`: chưa có quyền thì hiện form hoặc "chưa mở"; có quyền thì đọc params rồi render các khối. Đặt `dynamic = "force-dynamic"`. |
| `src/app/(public)/phan-tich/actions.ts` | Server action nhận mật khẩu xem và đặt cookie. |
| `src/components/analytics/*` | `SummaryTiles`, `StatusBar`, `GroupTable` (client, để sắp cột và mở rộng dòng), `TopList`, `ViewerPasswordForm`. Mỗi file một khối. |
| `src/app/(admin)/admin/account/*` | Thêm form "Mật khẩu xem phân tích" (đặt, đổi, tắt). |
| Chân trang danh mục, menu admin | Thêm link "Phân tích". |
| `docs/decisions/ADR-012-analytics-page.md` | Ghi quyết định P1–P10, phạm vi, công thức. |

Truy vấn: một câu cho §5.1 và §5.2 (SUM và `COUNT(*) FILTER (...)` trên tập), một câu GROUP BY cho §5.3, hai câu cho §5.4. Không cần cache vì dữ liệu nhỏ (khoảng 3.000 SP) và cần luôn mới sau mỗi lần nhập Excel.

## 7. Kiểm thử

- **Integration (`analytics.test.ts`, dùng `catalog-fixture`):**
  - §5.1 bằng tổng cộng từ `listProducts({ ...params, limit: null })`, thử với: không lọc, lọc nhãn, lọc nhãn và khung giá, chọn cửa hàng (`all` = 0 và 1), tìm mã;
  - §5.2: số mã theo trạng thái khớp với đếm `stockStatus` trên các item của `listProducts`; Hết hàng đếm đúng;
  - §5.3, các chiều thuộc tính SP (nhãn → khung giá): tổng Số mã, Đặt, Về, Thiếu, Bán, Tồn của các dòng bằng §5.1; dòng "rỗng" xuất hiện khi có SP thiếu thuộc tính đó;
  - §5.3, chiều Cửa hàng (không chọn cửa hàng): tổng Đặt, Về, Bán, Tồn của các dòng bằng §5.1. Số mã và Thiếu **không** cộng ra §5.1, vì một SP có thể được tính ở nhiều cửa hàng và Thiếu tính riêng theo từng cửa hàng;
  - §5.3, chiều Cửa hàng: Số mã chỉ đếm SP có đặt > 0, cửa hàng ẩn không có dòng;
  - §5.4: thứ tự, xử lý hòa, chỉ lấy Bán > 0 và Thiếu > 0, tối đa 10;
  - ΣĐặt = 0 thì % về là null; Bán + Tồn = 0 thì % bán là null.
- **Integration (`viewer-pass.test.ts`):** đặt và kiểm mật khẩu; sai 5 lần thì khóa; hết khóa thì nhập lại được; đổi mật khẩu thì cookie cũ không hợp lệ; cookie bị sửa thì không hợp lệ; cookie hết hạn thì không hợp lệ; chưa đặt mật khẩu thì không vào được (admin vẫn vào được).
- **Unit:** đọc `nhom` (giá trị lạ về `brand`); `GroupTable` sắp cột.
- **E2E (`analytics.spec.ts`, 375px và 1280px):**
  - chưa có cookie thì thấy form; nhập sai thì báo lỗi; nhập đúng thì thấy các khối;
  - lọc nhãn thì số đổi và URL có `brand=`;
  - đổi chiều nhóm thì URL có `nhom=`;
  - bấm tên nhóm thì bộ lọc có thêm giá trị đó;
  - bấm mã trong top thì popup SP mở;
  - ở 375px không cuộn ngang cả trang;
  - admin đã đăng nhập vào thẳng.

## 8. Câu hỏi còn mở

Không còn câu hỏi mở.
