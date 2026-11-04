# Trang phân tích `/phan-tich` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/phan-tich` có mật khẩu xem chung. Trang cho xem số tổng, số mã theo trạng thái, bảng so sánh theo nhóm và top 10 mã của các BST, theo đúng bộ lọc của danh mục.

**Architecture:**
- **Tính số:** một service SQL mới (`analytics.ts`) dùng chung `catalogFromSql` và công thức ở `metrics.ts`, nên số luôn khớp danh mục.
- **Cổng truy cập:** cổng mật khẩu bằng cookie ký HMAC, lưu cấu hình trong bảng `app_setting` mới.
- **Giao diện:** trang server component dùng lại thanh lọc, thanh cửa hàng và popup SP của danh mục. Để làm được vậy, `CatalogNavProvider` học thêm `path`, vì hiện các link đang gắn cứng `/`.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 6 + Postgres (raw SQL qua `Prisma.sql`), Auth.js v5 (admin), Zod 4, Tailwind 4, Vitest (unit + integration), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-analytics-dashboard-design.md`

## Global Constraints

- Không có doanh thu hay giá trị theo đồng, không có lịch sử theo thời gian, thanh trạng thái không bấm được, không xuất Excel (spec §2).
- % hàng về = `min(ΣVề / ΣĐặt, 1)`, ΣĐặt = 0 → null ("—"); % bán = `sellThrough(ΣBán, ΣTồn)`; Thiếu = Σ `max(Đặt−Về, 0)` **từng SP** (spec §5.1).
- Phạm vi cửa hàng giống danh mục (ADR-002 D6): không chọn cửa hàng thì tính tổng các cửa hàng đang hiện; chọn cửa hàng thì chỉ tính SP có đặt > 0, trừ khi `all=1`.
- Cookie `xtt_view`: HMAC bằng `AUTH_SECRET`, `HttpOnly`, `Secure` ở production, `SameSite=Lax`, hiệu lực **30 ngày**, mang phiên bản mật khẩu (spec P5, P6).
- Khóa sau `MAX_FAILED_ATTEMPTS` = 5 lần sai, trong `LOCK_WINDOW_MS` = 15 phút (dùng lại hằng số trong `src/server/auth/login.ts`). Độ dài tối thiểu `MIN_PASSWORD_LENGTH` (`src/lib/password.ts`).
- Khóa `app_setting`: `viewer_password_hash`, `viewer_password_version`, `viewer_failed_count`, `viewer_locked_until`.
- URL chiều nhóm: `?nhom=brand|line|col|mat|typ|pr|store`, mặc định và khi gặp giá trị lạ là `brand`.
- Tên dòng rỗng: "Ngoài bộ sưu tập", "Chưa có tuổi vàng", "Chưa có chủng loại", "Ngoài khung giá".
- Chữ trên UI, chú thích code và tên test viết tiếng Việt như code hiện có. Kiểm tra giao diện ở 375px và 1280px (TASKS §7).
- Commit message kết thúc bằng một dòng trống rồi `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Đổi bộ lọc, tìm mã, chọn cửa hàng, mở hoặc đóng popup trên `/phan-tich`:** phải ở lại `/phan-tich` và giữ `nhom=`, không nhảy về danh mục `/`. → test ở Task 1 (unit) và Task 7 (e2e).
2. **Cookie cũ sau khi đổi mật khẩu, cookie bị sửa một ký tự, cookie hết hạn:** đều bị từ chối và người xem thấy lại form. → test ở Task 2.
3. **Chiều "Khung giá" khi có SP chưa có giá hoặc nằm ngoài mọi khung; chiều "Tuổi vàng", "Chủng loại" khi có SP thiếu thuộc tính:** xuất hiện đúng một dòng rỗng với tên trong Global Constraints, và tổng các dòng vẫn bằng số tổng. → test ở Task 5.
4. **Cửa hàng đang ẩn:** không có dòng ở chiều Cửa hàng và không được cộng vào số tổng. Chọn cửa hàng không tồn tại thì rơi về tổng hệ thống như danh mục. → test ở Task 4 và Task 5.
5. **Thanh lọc trên `/phan-tich` không có menu hay chip sắp xếp, thanh cửa hàng không có công tắc "Chỉ xem hình":** ở trang này hai thứ đó vô nghĩa và gây hiểu nhầm. → test ở Task 6.

---

### Task 1: `CatalogNavProvider` biết đường dẫn trang

**Files:**
- Modify: `src/components/catalog/catalog-nav.tsx`, `product-link.tsx`, `product-dialog.tsx`, `product-swipe.tsx`, `catalog-section.tsx` (link "Xóa lọc" `/${clearHref}`)
- Test: `tests/unit/catalog-nav.test.ts` (tạo)

**Interfaces:**
- Produces:
  - `CatalogNavProvider({ params, path = "/", keep = "", children })`. `path` là đường dẫn trang (`"/"` hoặc `"/phan-tich"`). `keep` là chuỗi truy vấn thêm, không bắt đầu bằng `?` hay `&`, ví dụ `"nhom=line"`, được nối vào mọi URL mà provider dựng ra.
  - Context có thêm `hrefFor(state: CatalogParams, hash?: string): string`, trả `path + query + hash`. Ví dụ `hrefFor({...s, sp:"AK1"})` → `"/phan-tich?sp=AK1&nhom=line"`; khi không có tham số nào thì trả `"/phan-tich?nhom=line"` hoặc `"/"`.
  - `go()`, `ProductLink`, `ClickableRow`, `ProductDialog.close()`, `ProductSwipe.urlFor` và link "Xóa lọc" của danh mục đều dựng URL qua `hrefFor` (hoặc cùng quy tắc). Không còn chỗ nào gắn cứng `` `/${buildCatalogQuery(...)}` ``.

- [ ] **Step 1: Viết test (thất bại)** trong `tests/unit/catalog-nav.test.ts`. Mock `next/navigation` như `product-card.test.ts`, render bằng `renderToStaticMarkup`:
  - `it("mặc định path / — link SP như cũ")`: `ProductLink` trong provider có params `{ sort: "price_asc" }` → `href="/?sort=price_asc&amp;sp=NTT001"`.
  - `it("path /phan-tich + keep nhom=line — link SP ở lại trang và giữ nhom")`: → `href="/phan-tich?sp=NTT001&amp;nhom=line"`.
  - `it("hrefFor không tham số → path + keep")`: gọi `hrefFor` qua một component thử, kết quả là `"/phan-tich?nhom=line"`; với `path="/"` và `keep=""` thì kết quả là `"/"`.
- [ ] **Step 2: Chạy** `npx vitest run tests/unit/catalog-nav.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt.** Thêm `path`, `keep` và `hrefFor` vào provider và context. Thay mọi chỗ dựng URL gắn cứng (danh sách file ở trên). Kiểm tra bằng `grep -rn '\`/\${buildCatalogQuery' src` → không còn kết quả.
- [ ] **Step 4: Chạy** `npx vitest run --project unit` và `npx playwright test tests/e2e/product-detail.spec.ts tests/e2e/photo-mode.spec.ts` (cần DB, xem `implementer-rules`) → PASS, danh mục không đổi hành vi.
- [ ] **Step 5: Commit** `git commit -m "CatalogNavProvider: đường dẫn trang và tham số giữ lại, bỏ URL gắn cứng /"`

### Task 2: Bảng `app_setting` và mật khẩu xem chung

**Files:**
- Modify: `prisma/schema.prisma` (model `AppSetting`)
- Create: `prisma/migrations/20261105000000_app_setting/migration.sql`, `src/server/auth/viewer-pass.ts`, `docs/decisions/ADR-012-analytics-page.md`
- Test: `tests/integration/viewer-pass.test.ts`

**Interfaces:**
- Produces (`src/server/auth/viewer-pass.ts`):
  - `VIEWER_COOKIE = "xtt_view"`, `VIEWER_COOKIE_MAX_AGE_S = 30 * 24 * 3600`
  - `setViewerPassword(password: string): Promise<void>`: kiểm tra độ dài bằng `assertPasswordPolicy`, lưu chuỗi băm, tăng phiên bản, xóa bộ đếm sai.
  - `clearViewerPassword(): Promise<void>`: xóa chuỗi băm và tăng phiên bản.
  - `isViewerPasswordSet(): Promise<boolean>`
  - `verifyViewerPassword(password: string, now?: Date): Promise<{ ok: true; cookie: string } | { ok: false; reason: "invalid" | "unset" } | { ok: false; reason: "locked"; lockedUntil: Date }>`. Quy tắc khóa giống `verifyAdminLogin`: lần sai cách lần trước quá 15 phút thì đếm lại từ đầu, và khi đang khóa thì không kiểm tra mật khẩu.
  - `signViewerCookie(version: number, expiresAt: Date): string` và `readViewerCookie(value: string | undefined, now?: Date): { version: number } | null`
  - `isCurrentViewerCookie(value: string | undefined, now?: Date): Promise<boolean>`: cookie hợp lệ, chưa hết hạn, đúng phiên bản hiện tại và đã đặt mật khẩu.
  - `hasViewerAccess(): Promise<boolean>`: true khi `isCurrentViewerCookie(cookies().get(VIEWER_COOKIE)?.value)` đúng, **hoặc** khi `requireAdmin()` không ném `UnauthorizedError`.
- `AppSetting { key String @id; value String; updatedAt DateTime @updatedAt @map("updated_at") @@map("app_setting") }`

- [ ] **Step 1: Viết integration test** `viewer-pass.test.ts` (theo mẫu của `login.test.ts`):
  - `"chưa đặt → verify trả unset, isViewerPasswordSet false"`
  - `"đặt rồi verify đúng → ok + cookie đọc lại được với version hiện tại"`
  - `"sai 5 lần → locked; lần 6 đúng mật khẩu vẫn locked; sau 15 phút + 1ms thì đúng là ok"` (truyền `now`)
  - `"đổi mật khẩu → isCurrentViewerCookie(cookie cũ) false, cookie mới true"`
  - `"clearViewerPassword → isCurrentViewerCookie(cookie đang hợp lệ) false"`
  - `"cookie bị sửa 1 ký tự → null; cookie hết hạn → null"`
  - `"mật khẩu ngắn hơn MIN_PASSWORD_LENGTH → setViewerPassword ném lỗi"`
  - `"clearViewerPassword → verify trả unset"`
- [ ] **Step 2: Chạy** `npm run test:integration -- viewer-pass` → FAIL.
- [ ] **Step 3: Cài đặt.**
  - Thêm model và migration.
  - Cookie có dạng `base64url(version.expiresMs).base64url(hmacSHA256)`, so chữ ký bằng `timingSafeEqual`.
  - `hasViewerAccess` đọc cookie bằng `cookies()` của `next/headers`.
  - Viết ADR-012 ngắn: quy định P1–P10 của spec, công thức ở §5.1, ghi rủi ro khóa chung là rủi ro đã chấp nhận.
- [ ] **Step 4: Chạy lại** → PASS. Chạy `npm run typecheck`.
- [ ] **Step 5: Commit** `git commit -m "Mật khẩu xem chung cho trang phân tích (app_setting, cookie ký HMAC)"`

### Task 3: Admin quản lý mật khẩu xem và menu "Phân tích"

**Files:**
- Modify: `src/app/(admin)/admin/account/page.tsx`, `src/app/(admin)/admin/account/actions.ts`, `src/app/(admin)/admin/layout.tsx` (NAV thêm `{ href: "/phan-tich", label: "Phân tích", ready: true }`)
- Create: `src/app/(admin)/admin/account/viewer-password-form.tsx` (client, theo mẫu `password-form.tsx`)
- Test: `tests/integration/viewer-pass-actions.test.ts`

**Interfaces:**
- Consumes: `setViewerPassword`, `clearViewerPassword`, `isViewerPasswordSet` (Task 2).
- Produces: server actions `setViewerPasswordAction(prev, formData)` và `clearViewerPasswordAction()`. Cả hai gọi `requireAdmin()` trước, trả `{ ok: boolean; message: string }` giống action đổi mật khẩu admin.

- [ ] **Step 1: Viết test** (mock session theo mẫu `require-admin.test.ts` / `master-data-actions.test.ts`):
  - `"không phải admin → action ném UnauthorizedError, không đổi gì"`
  - `"admin đặt mật khẩu hợp lệ → isViewerPasswordSet true, message 'Đã lưu mật khẩu xem'"`
  - `"mật khẩu ngắn → ok false, message nêu tối thiểu MIN_PASSWORD_LENGTH ký tự"`
  - `"tắt → isViewerPasswordSet false, message 'Đã tắt trang phân tích'"`
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt.**
  - Thêm section "Mật khẩu xem phân tích" dưới "Đổi mật khẩu". Dòng mô tả: "Ai có mật khẩu này mở được trang /phan-tich trong 30 ngày. Đổi mật khẩu thì mọi người phải nhập lại."
  - Hiện trạng thái "Đang mở" hoặc "Chưa mở". Có ô mật khẩu mới, nút "Lưu" và nút "Tắt trang phân tích". Nút tắt dùng `ConfirmDialog` có sẵn.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Admin: đặt / đổi / tắt mật khẩu xem phân tích; menu Phân tích"`

### Task 4: Tham số `nhom` và service số tổng, trạng thái, top

**Files:**
- Create: `src/lib/analytics-params.ts`, `src/server/services/analytics.ts`
- Test: `tests/unit/analytics-params.test.ts`, `tests/integration/analytics-summary.test.ts` (dùng `catalog-fixture.ts`)

**Interfaces:**
- Consumes: `catalogFromSql`, `findActiveStore` (`src/server/services/catalog.ts` / `catalog-filter.ts`); `computeMetrics`, `sellThrough` (`src/lib/metrics.ts`); `StockStatus` (`src/lib/status.ts`).
- Produces:
  ```ts
  // analytics-params.ts
  export const GROUP_DIMS = ["brand","line","col","mat","typ","pr","store"] as const;
  export type GroupDim = (typeof GROUP_DIMS)[number];
  export function parseGroupDim(raw: string | string[] | undefined): GroupDim; // lạ → "brand"
  // analytics.ts
  export interface AnalyticsTotals { products: number; ordered: number; received: number; shortage: number; sold: number; stock: number; receivedRate: number | null; sellRate: number | null }
  export interface AnalyticsSummary extends AnalyticsTotals { status: Record<StockStatus, number>; soldOut: number }
  export type AnalyticsParams = Pick<CatalogParams, "brand"|"line"|"col"|"mat"|"typ"|"pr"|"store"|"all"|"q">;
  export function getAnalyticsSummary(params: AnalyticsParams): Promise<AnalyticsSummary>;
  export interface TopItem { sku: string; name: string | null; thumbUrl: string | null; value: number }
  export function getTopProducts(params: AnalyticsParams, kind: "sold" | "shortage", limit?: number /* 10 */): Promise<TopItem[]>;
  ```
  `soldOut` = số SP có Về > 0 và Tồn = 0 (theo phạm vi).

- [ ] **Step 1: Viết test.**
  - Unit: `parseGroupDim("line") === "line"`, `parseGroupDim("x") === "brand"`, `parseGroupDim(undefined) === "brand"`, `parseGroupDim(["pr","line"]) === "pr"`.
  - Integration `analytics-summary.test.ts`: hàm phụ `expected(params)` cộng từ `listProducts({...params, limit: null}).items`, gồm `products = items.length` và các tổng của ordered, received, shortage, sold, stock. Chạy hàm này với các bộ: `{}`; lọc một nhãn; nhãn + khung giá; một cửa hàng với `all=false`; cùng cửa hàng đó với `all=true`; `q`; cửa hàng không tồn tại.
    - `it("số tổng khớp listProducts với …")`: so mọi trường; `receivedRate` bằng `computeMetrics(Σordered, Σreceived).rate`, `sellRate` bằng `sellThrough(Σsold, Σstock)`.
    - `it("đếm trạng thái khớp stockStatus từng item; soldOut đếm Về>0 và Tồn=0")`.
    - `it("ΣĐặt=0 → receivedRate null; Bán+Tồn=0 → sellRate null")`, dùng bộ lọc chỉ chứa SP không đặt.
    - `it("cửa hàng ẩn không cộng vào tổng")`.
    - `it("top sold: tối đa 10, chỉ value>0, giảm dần, hòa theo sku tăng dần")` và test tương tự cho `shortage`.
- [ ] **Step 2: Chạy** `npx vitest run tests/unit/analytics-params.test.ts` và `npm run test:integration -- analytics-summary` → FAIL.
- [ ] **Step 3: Cài đặt.**
  - Số tổng và trạng thái tính bằng một câu SQL: `SUM` và `COUNT(*) FILTER (WHERE …)` trên `catalogFromSql(params, store)`. Điều kiện trạng thái viết bằng SQL theo đúng thứ tự của `stockStatus`.
  - Top dùng `ORDER BY value DESC, p.sku ASC LIMIT`.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Service phân tích: số tổng, trạng thái, top 10"`

### Task 5: Bảng so sánh theo nhóm

**Files:**
- Modify: `src/server/services/analytics.ts`
- Test: `tests/integration/analytics-groups.test.ts`

**Interfaces:**
- Consumes: `AnalyticsParams`, `AnalyticsTotals`, `GroupDim` (Task 4).
- Produces:
  ```ts
  export interface GroupRow extends AnalyticsTotals {
    /** Id UUID, mã cửa hàng, hoặc null cho dòng rỗng. */
    id: string | null;
    name: string;
  }
  export function getGroupBreakdown(params: AnalyticsParams, dim: GroupDim): Promise<GroupRow[]>;
  ```
  Thứ tự trả về: theo `products` giảm dần, hòa thì theo `name`. Không trả nhóm có 0 SP.

- [ ] **Step 1: Viết test.**
  - `it("chiều thuộc tính SP (brand…pr): tổng products/ordered/received/shortage/sold/stock các dòng = getAnalyticsSummary")`, chạy cho cả 6 chiều với `{}` và với một bộ lọc nhãn.
  - `it("col có SP ngoài BST → dòng id null tên 'Ngoài bộ sưu tập'")`. Tương tự cho `mat` → "Chưa có tuổi vàng", `typ` → "Chưa có chủng loại", `pr` (SP không có `price_range_id`) → "Ngoài khung giá". Fixture tạo SP thiếu từng thuộc tính.
  - `it("chiều store, không chọn cửa hàng: Σordered/received/sold/stock = summary; products = số SP có đặt>0 ở cửa hàng đó")`.
  - `it("chiều store: cửa hàng ẩn không có dòng; chọn cửa hàng X → chỉ một dòng X")`.
  - `it("receivedRate/sellRate từng dòng theo công thức §5.1, null khi mẫu 0")`.
- [ ] **Step 2: Chạy** `npm run test:integration -- analytics-groups` → FAIL.
- [ ] **Step 3: Cài đặt.**
  - **Sáu chiều thuộc tính SP:** `GROUP BY` khóa ngoại tương ứng (`p.brand_id`, `p.product_line_id`, `p.collection_id`, `p.material_id`, `p.product_type_id`, `p.price_range_id`) trên `catalogFromSql`, rồi `LEFT JOIN` bảng tên. Kiểm tên cột thật trong `schema.prisma` trước khi viết.
  - **Chiều store:** lấy tập `SELECT p.id ${catalogFromSql(...)}`, `JOIN store_product_qty` và `JOIN store s ON s.active`. Nếu `params.store` hợp lệ thì chỉ giữ cửa hàng đó. Số mã là `COUNT(*) FILTER (WHERE qty_ordered > 0)`. Thiếu tính theo từng cặp (SP, cửa hàng).
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Service phân tích: so sánh theo nhãn, dòng, BST, tuổi vàng, chủng loại, khung giá, cửa hàng"`

### Task 6: Trang `/phan-tich`

**Files:**
- Create:
  - `src/app/(public)/phan-tich/page.tsx`, `src/app/(public)/phan-tich/actions.ts`
  - `src/components/analytics/viewer-password-form.tsx`, `summary-tiles.tsx`, `status-bar.tsx`, `group-table.tsx` (client), `group-dim-picker.tsx`, `top-list.tsx`
- Modify:
  - `src/components/catalog/store-bar.tsx`: prop `showPhotoSwitch = true`
  - `src/components/catalog/filter-bar.tsx`: prop `showSort = true`, ẩn chip sắp xếp trong bảng lọc của điện thoại
  - `src/components/catalog/site-footer.tsx`: link nhỏ "Phân tích" → `/phan-tich`
- Test: `tests/unit/group-table.test.ts`, `tests/unit/filter-bar-sort.test.ts`

**Interfaces:**
- Consumes:
  - từ Task 1: `CatalogNavProvider` với `path="/phan-tich"` và `keep={\`nhom=${dim}\`}` (bỏ `keep` khi `dim === "brand"`);
  - từ Task 2: `hasViewerAccess`, `isViewerPasswordSet`, `verifyViewerPassword`, `VIEWER_COOKIE`, `VIEWER_COOKIE_MAX_AGE_S`;
  - từ Task 4 và 5: `getAnalyticsSummary`, `getGroupBreakdown`, `getTopProducts`, `parseGroupDim`;
  - có sẵn: `parseCatalogParams`, `pruneInvalidSelections`, `getFacetCounts`, `FilterBar`, `StoreBar`, `ProductDetailSection`, `ProductLink`.
- Produces:
  - `sortGroupRows(rows: GroupRow[], key: keyof AnalyticsTotals | "name", dir: "asc" | "desc"): GroupRow[]` (trong `group-table.tsx`, null xếp cuối ở cả hai chiều). `GroupTable` dùng hàm này khi bấm tiêu đề cột, bấm lại thì đảo chiều.
  - `viewerLoginAction(prev, formData)`: form gửi kèm trường ẩn `next` (chuỗi truy vấn hiện tại). Khi đúng mật khẩu thì đặt cookie và `redirect("/phan-tich" + next)`, chỉ nhận `next` rỗng hoặc bắt đầu bằng `?`. Khi sai thì trả `{ error: "Mật khẩu không đúng" }`, hoặc `"Tạm khóa, thử lại sau HH:mm"` khi đang bị khóa.

- [ ] **Step 1: Viết unit test.**
  - `group-table.test.ts`: render `GroupTable` với 3 dòng.
    - Mặc định thứ tự theo `products` giảm dần.
    - Có thanh % (`role="progressbar"` hoặc `data-testid="rate-bar"`).
    - `receivedRate: null` hiện "—".
    - Tên nhóm là link thêm giá trị vào bộ lọc, ví dụ `brand=<id>`, `col=none` cho dòng rỗng của BST. Dòng rỗng của mat, typ, pr không phải link.
  - `group-table.test.ts` thêm: `sortGroupRows` theo `sellRate` giảm dần đưa dòng null xuống cuối; theo `name` tăng dần đúng thứ tự tiếng Việt (`localeCompare(…, "vi")`).
  - `filter-bar-sort.test.ts`: `FilterBar` với `showSort={false}` → markup không chứa "Sắp xếp" và không có chip `SORT_LABELS`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt trang** (đúng thứ tự khối của spec §5):
  - **Cổng:** chưa có quyền và chưa đặt mật khẩu thì hiện "Trang phân tích chưa mở". Chưa có quyền nhưng đã đặt mật khẩu thì hiện `ViewerPasswordForm`.
  - **Khi có quyền**, render lần lượt:
    1. `StoreBar showPhotoSwitch={false}`;
    2. `FilterBar showSort={false}`, toolbar chỉ có `AllProductsSwitch` khi đã chọn cửa hàng;
    3. `SummaryTiles` gồm 6 ô và 2 thanh;
    4. `StatusBar` gồm 4 đoạn và ô "Hết hàng: N mã";
    5. `GroupDimPicker` (các link `nhom=`) và `GroupTable` có dòng tổng;
    6. 2 `TopList` (mỗi dòng là `ProductLink`);
    7. popup `ProductDetailSection` khi có `sp`.
  - **Khi 0 SP:** hiện "Không có sản phẩm phù hợp" và nút **Xóa lọc** giữ `nhom`.
  - `export const dynamic = "force-dynamic"`, `metadata.title = "Phân tích"`.
  - **Điện thoại < 768px:** `GroupTable` chỉ hiện Tên, % về, % bán; bấm dòng thì mở rộng xem đủ số (`aria-expanded`).
  - Màu đoạn trạng thái dùng token `status-*`, chữ trên nền màu dùng token `*-fg`.
- [ ] **Step 4: Chạy** unit → PASS; `npm run typecheck`; kiểm giao diện ở 375px và 1280px bằng ảnh chụp Playwright: có nhập mật khẩu, có lọc, có bảng nhóm, không cuộn ngang cả trang.
- [ ] **Step 5: Commit** `git commit -m "Trang /phan-tich: cổng mật khẩu, số tổng, trạng thái, so sánh nhóm, top 10"`

### Task 7: E2E và hướng dẫn

**Files:**
- Create: `tests/e2e/analytics.spec.ts`
- Modify: `docs/user-guide.md` (mục mới "Trang phân tích"), `playwright.config.ts` (nếu spec cần đặt mật khẩu trước, dùng `beforeAll` gọi `setViewerPassword` qua prisma)

**Interfaces:**
- Consumes: testid hoặc role của Task 6. Mật khẩu test là `"xem-thu-2027"`, được đặt trong `beforeAll` và gọi `clearViewerPassword` trong `afterAll`.

- [ ] **Step 1: Viết e2e** (chạy ở project `mobile` và `desktop`):
  - `"chưa có cookie → form; sai → 'Mật khẩu không đúng'; đúng → thấy Số mã"`.
  - `"lọc một nhãn → URL ở /phan-tich, có brand=, ô Số mã đổi"`.
  - `"đổi chiều nhóm sang Dòng → URL có nhom=line; đổi bộ lọc sau đó vẫn giữ nhom=line và ở /phan-tich"` (Review Focus 1).
  - `"bấm tên nhóm trong bảng → bộ lọc có thêm giá trị đó"`.
  - `"bấm mã trong Top bán chạy → popup SP mở; ✕ → về /phan-tich (không về /)"`.
  - `"không có menu Sắp xếp, không có công tắc Chỉ xem hình"` (Review Focus 5).
  - `"375px: không cuộn ngang cả trang"`.
  - `"chân trang danh mục có link Phân tích tới /phan-tich"`.
- [ ] **Step 2: Chạy** `npx playwright test tests/e2e/analytics.spec.ts` → PASS. Chạy thêm `photo-mode.spec.ts` và `product-detail.spec.ts` để chắc danh mục không vỡ.
- [ ] **Step 3: Viết hướng dẫn:**
  - cách đặt mật khẩu trong Tài khoản;
  - gửi link `/phan-tich` kèm mật khẩu cho người cần xem;
  - ý nghĩa từng chỉ số, trong đó % về tính trên tổng chứ không phải trung bình;
  - khi so sánh theo cửa hàng thì tổng Số mã và Thiếu của các dòng không bằng số tổng.
- [ ] **Step 4: Tắt dev server, db:local và postgres còn giữ cổng 5432.**
- [ ] **Step 5: Commit** `git commit -m "E2E và hướng dẫn trang phân tích"`
