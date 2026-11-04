# Chế độ "Chỉ xem hình" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người chỉ cần xem hình + thông tin SP mùa Xuân Thần Tài mở một link (hoặc bật một công tắc) là trang danh mục ẩn hết số Đặt / Về / Thiếu / Bán / Tồn / trạng thái; trong popup bấm ảnh để phóng to toàn màn hình và vuốt trái/phải (mũi tên, phím ←/→) để sang SP trước/sau.

**Architecture:** Thêm tham số URL `?xem=hinh` vào `CatalogParams` (trường `photo: boolean`). Vì mọi liên kết trong trang đều dựng từ `buildCatalogQuery`, chế độ này tự đi theo khi lọc, tìm, mở popup, "Xem thêm". Các thành phần hiển thị số lượng nhận cờ `photo` và không render phần số liệu. Không thêm đăng nhập/vai trò: trang vẫn công khai (ADR-004 A1), đây là tiện ích hiển thị, không phải phân quyền.

**Tech Stack:** Next.js 15 App Router (server components), React 19, Zod 4, Tailwind 4, Vitest, Playwright.

**Spec:** Yêu cầu của chủ dự án (2026-11-04): "một số user chỉ muốn coi hình sản phẩm … không cần quan tâm số lượng đặt - về - bán, chỉ muốn coi hình và thông tin sản phẩm." Quyết định ghi vào ADR mới ở Task 1.

## Global Constraints

- URL: `?xem=hinh` bật chế độ; mọi giá trị khác hoặc không có = chế độ đầy đủ. Không bao giờ ném lỗi (giống các tham số khác, ARCHITECTURE §5.1).
- Nhãn công tắc trên UI: **"Chỉ xem hình"**.
- Chế độ hình vẫn hiện: ảnh, mã SP, tên, nhãn, dòng, BST, tuổi vàng, chủng loại, giá.
- Chế độ hình ẩn: thanh tiến độ "Về X/Y", "Còn thiếu", "Bán · Tồn · %", nhãn trạng thái (`StatusBadge`), các cột số lượng ở dạng Bảng, khung tóm tắt + bảng theo cửa hàng ở popup, nút "Xuất Excel", 2 kiểu sắp xếp `shortage` và `sold`.
- Thanh cửa hàng + ô tìm mã giữ nguyên.
- Phóng to ảnh và chuyển SP trước/sau áp dụng cho **cả hai chế độ** (popup dùng chung).
- Thứ tự trước/sau = đúng thứ tự danh sách đang xem (cùng bộ lọc, tìm mã, cửa hàng, "Xem tất cả SP", sắp xếp), không phụ thuộc số SP đã tải ("Xem thêm").
- Chuyển SP trong popup dùng `router.replace` (không thêm lịch sử): Back/✕ vẫn đóng popup một lần là xong.
- Chữ trên UI, chú thích code, tên test viết tiếng Việt như code hiện có.
- Kiểm tra UI ở 375px và 1280px (TASKS §7).

## Review Focus

1. **Vuốt ngang trên bảng SL theo cửa hàng (chế độ đầy đủ, điện thoại)** — bảng đó cuộn ngang; người dùng mong cuộn bảng chứ không bị nhảy sang SP khác. Chỉ nhận vuốt bắt đầu trên ảnh/khối thông tin. → test ở Task 6.
2. **SP đầu/cuối danh sách, hoặc popup mở từ link có `sp` không thuộc bộ lọc hiện tại** — không có nút/vuốt dẫn tới SP không tồn tại; nút phía đó ẩn (hoặc ẩn cả hai). → test service ở Task 6.
3. **Đổi bộ lọc/tìm mã/mở popup/"Xem thêm"/Lưới↔Bảng/chuyển SP khi đang ở chế độ hình** — chế độ phải giữ nguyên, không bật lại số lượng. → round-trip ở Task 1, e2e ở Task 4 và Task 6.
4. **Link cũ có `?sort=shortage&xem=hinh`** (hoặc `sold`) — danh sách và thứ tự trước/sau theo Mã A→Z, menu không hiện kiểu bị ẩn. → test ở Task 1 và Task 3.
5. **Đang phóng to ảnh mà bấm Esc / Back** — chỉ đóng lớp phóng to, popup SP vẫn mở; Esc lần nữa mới đóng popup. → e2e ở Task 5.

---

### Task 1: Tham số `photo` trong `CatalogParams` + ADR

**Files:**
- Modify: `src/lib/catalog-params.ts`
- Test: `tests/unit/catalog-params.test.ts`
- Create: `docs/decisions/ADR-011-photo-mode.md`

**Interfaces:**
- Produces: `CatalogParams.photo: boolean`; `PHOTO_HIDDEN_SORTS: readonly Sort[]` = `["shortage", "sold"]`; `buildCatalogQuery` ghi `xem=hinh` khi `photo` true.

- [ ] **Step 1: Viết test (thất bại)** trong `tests/unit/catalog-params.test.ts`:
  - Test mặc định hiện có: thêm `photo: false` vào object `toEqual`.
  - `it("xem=hinh bật chế độ hình; giá trị khác thì tắt")`: `parseCatalogParams({ xem: "hinh" }).photo === true`; `{ xem: "abc" }` và `{}` → `false`.
  - `it("chế độ hình: sort shortage/sold rơi về sku")`: `parseCatalogParams({ xem: "hinh", sort: "shortage" }).sort === "sku"`, tương tự `"sold"`; `{ xem: "hinh", sort: "price_desc" }.sort === "price_desc"`; `{ sort: "sold" }.sort === "sold"` (chế độ đầy đủ không đổi).
  - Test round-trip hiện có: thêm `xem: "hinh"` vào input.
  - `it("buildCatalogQuery ghi xem=hinh")`: `buildCatalogQuery({ photo: true }) === "?xem=hinh"`; `buildCatalogQuery({ photo: false }) === ""`.
- [ ] **Step 2: Chạy** `npx vitest run tests/unit/catalog-params.test.ts` → FAIL (thiếu `photo`).
- [ ] **Step 3: Cài đặt.** Trong schema Zod thêm khóa `xem: single.transform((v) => v === "hinh")`; trong `parseCatalogParams` đổi tên `xem` → `photo` và áp `PHOTO_HIDDEN_SORTS` (nếu `photo` và sort thuộc danh sách → `"sku"`). Trong `buildCatalogQuery`: `if (p.photo) u.set("xem", "hinh")`. Cập nhật chú thích đầu file (thêm `&xem=hinh`).
- [ ] **Step 4: Chạy lại** → PASS. Chạy `npm run typecheck` — sẽ báo lỗi ở nơi tạo `CatalogParams` thủ công (nếu có), sửa bằng `photo: false`.
- [ ] **Step 5: ADR-011** (ngắn, theo mẫu ADR-004): quyết định `?xem=hinh`, danh sách hiện/ẩn ở Global Constraints, lý do không dùng đăng nhập/vai trò (trang công khai, A1 — ai bỏ tham số vẫn thấy số lượng, chấp nhận được vì đây không phải bảo mật).
- [ ] **Step 6: Commit** `git commit -m "Tham số xem=hinh cho chế độ chỉ xem hình"`

### Task 2: Thẻ, Bảng, Popup ẩn số lượng ở chế độ hình

**Files:**
- Modify: `src/components/catalog/product-card.tsx`, `product-grid.tsx`, `product-table.tsx`, `product-detail-section.tsx`, `catalog-section.tsx`, `src/app/(public)/page.tsx`
- Test: `tests/unit/product-card.test.ts` (thêm), `tests/unit/product-table.test.ts` (tạo, cùng kiểu render `renderToStaticMarkup` + `CatalogNavProvider` như product-card test)

**Interfaces:**
- Consumes: `CatalogParams.photo` (Task 1).
- Produces: `ProductCard({ item, priority?, photo? })`, `ProductGrid({ items, photo? })`, `ProductTable({ items, photo? })` — `photo` mặc định `false`; `ProductDetailSection({ sku, params }: { sku: string; params: CatalogParams })` (thay cho `{ sku, store }`; đọc `params.store`, `params.photo`, Task 6 dùng thêm bộ lọc/sort).

- [ ] **Step 1: Viết test (thất bại).**
  - product-card: `it("chế độ hình: có ảnh, mã, tên, giá; không có Về/Còn thiếu/Bán/Tồn/trạng thái")` — render với `photo: true`, `item({ metrics: computeMetrics(120, 90), sold: 5, stock: 3 })`; expect HTML chứa `NTT001`, `Nhẫn Kim Tiền`, `formatVnd(12_500_000)`; không chứa `role="progressbar"`, `Còn thiếu`, `Tồn`, `data-status=`.
  - product-table: `it("chế độ hình: chỉ cột Ảnh→Giá")` — tiêu đề có `Giá`, không có `>Đặt<`, `>Tồn<`, `Trạng thái`; `it("chế độ đầy đủ giữ cột Trạng thái")`.
- [ ] **Step 2: Chạy** `npx vitest run tests/unit/product-card.test.ts tests/unit/product-table.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt.**
  - `ProductCard`: `photo` true thì không render `StatusBadge` và cả khối `<div className="mt-1.5">` (tiến độ + Bán/Tồn).
  - `ProductTable`: `photo` true thì bỏ 8 cột Đặt…Trạng thái (th + td), góc bo `rounded-tr-xl` chuyển sang cột Giá, và bỏ `min-w-[820px]` (dùng `min-w-[560px]` cho điện thoại để cột Tên vẫn đọc được).
  - `DetailBody`: `photo` true thì bỏ khối `detail-summary`, tiêu đề "Tất cả cửa hàng" và bảng `store-qty-table`; ảnh trên điện thoại bỏ giới hạn `max-w-[30vh]` (giờ ảnh là nội dung chính).
  - `CatalogSection`: truyền `params.photo` xuống Grid/Table; ẩn `<ExportButton>` khi `photo`.
  - `page.tsx`: `<ProductDetailSection sku={params.sp} params={params} />`.
- [ ] **Step 4: Chạy lại** → PASS; `npm run test:unit` toàn bộ xanh.
- [ ] **Step 5: Commit** `git commit -m "Chế độ hình: thẻ, bảng, popup không hiện số lượng"`

### Task 3: Công tắc "Chỉ xem hình" + menu sắp xếp

**Files:**
- Modify: `src/components/catalog/view-toggle.tsx`, `src/components/catalog/catalog-toolbar.tsx`
- Test: `tests/unit/view-toggle.test.ts` (tạo), `tests/unit/sort-menu.test.ts` (tạo)

**Interfaces:**
- Consumes: `CatalogParams.photo`, `PHOTO_HIDDEN_SORTS` (Task 1).
- Produces: `PhotoModeToggle({ params }: { params: CatalogParams })` (server component, xuất từ `view-toggle.tsx`), đặt cạnh `ViewToggle` trên dòng tiêu đề "Tất cả sản phẩm" trong `page.tsx`.

- [ ] **Step 1: Viết test (thất bại).**
  - `it("tắt → link bật xem=hinh, giữ lọc")`: params `parseCatalogParams({ sort: "price_asc", q: "NTT" })` → href chứa `xem=hinh`, `sort=price_asc`, `q=NTT`; `aria-pressed="false"`.
  - `it("bật → link bỏ xem=hinh, giữ lọc")`: params có `xem: "hinh", view: "list"` → href không chứa `xem=`, có `view=list`; `aria-pressed="true"`.
  - sort-menu (render trong `CatalogNavProvider` với `xem: "hinh"`): không có `<option value="shortage">`, `<option value="sold">`; có `value="price_desc"`. Chế độ đầy đủ: đủ 6 option.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt.**
  - `PhotoModeToggle`: `<Link>` dạng nút viên thuốc cùng kiểu với `ViewToggle` (icon `Image` của lucide-react, chữ "Chỉ xem hình", `aria-pressed`, `scroll={false}`, `replace`), href = `buildCatalogQuery({ ...params, photo: !params.photo, n: undefined }) || "?"`. Bật thì nền `bg-brand text-white`. Điện thoại: chỉ hiện icon + chữ "Hình" để vừa dòng tiêu đề cùng Lưới/Bảng.
  - `SortMenu`: lọc `SORTS` bỏ `PHOTO_HIDDEN_SORTS` khi `state.photo`.
  - `page.tsx`: bọc `ViewToggle` + `PhotoModeToggle` trong `div.flex.gap-2`.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `git commit -m "Công tắc Chỉ xem hình cạnh Lưới/Bảng"`

### Task 4: E2E + hướng dẫn người dùng

**Files:**
- Create: `tests/e2e/photo-mode.spec.ts`
- Modify: `docs/user-guide.md` (mục mới "Chỉ xem hình — gửi link cho người chỉ cần xem mẫu")

**Interfaces:**
- Consumes: testid hiện có `product-card`, `product-table`, `product-detail`, `detail-summary`, `store-qty-table`, `export-button`, `sort-menu`; nút "Chỉ xem hình".

- [ ] **Step 1: Viết e2e** (chạy trên DB seed như `catalog.spec.ts`):
  - `"/?xem=hinh: thẻ không có progressbar, không có nút Xuất Excel"`.
  - `"bấm Chỉ xem hình → URL có xem=hinh; lọc tìm mã NTT vẫn giữ xem=hinh; bấm lại → mất xem=hinh"`.
  - `"mở thẳng /?xem=hinh&sp=<mã đầu tiên>: popup có ảnh, không có detail-summary, store-qty-table"`.
  - `"/?xem=hinh&sort=shortage: sort-menu có giá trị sku"`.
  - `"/?xem=hinh&view=list ở 375px: không cuộn ngang cả trang"` (dùng `noHorizontalScroll` như catalog.spec).
- [ ] **Step 2: Chạy** `npm run test:e2e -- photo-mode.spec.ts` → PASS (Task 1–3 đã xong). Chạy cả bộ `npm run test:e2e` để chắc không vỡ test cũ.
- [ ] **Step 3: Viết hướng dẫn**: link mẫu `https://<tên miền>/?xem=hinh`, ghi rõ người nhận vẫn có thể tắt công tắc để xem số lượng.
- [ ] **Step 4: Tắt dev server / db:local / postgres sau khi test.**
- [ ] **Step 5: Commit** `git commit -m "E2E và hướng dẫn chế độ Chỉ xem hình"`

### Task 5: Bấm ảnh trong popup → phóng to toàn màn hình

**Files:**
- Create: `src/components/catalog/image-zoom.tsx` (client)
- Modify: `src/components/catalog/product-detail-section.tsx` (bọc ảnh của `DetailBody`)
- Test: `tests/e2e/photo-mode.spec.ts` (thêm vào file của Task 4)

**Interfaces:**
- Produces: `ImageZoom({ src, alt, children }: { src: string | null; alt: string; children: React.ReactNode })` — `children` là `<ProductImage>` hiện có; `src` là `d.imageUrl ?? d.thumbUrl`. `src` null (chưa có ảnh) → render `children` nguyên trạng, không bấm được.

- [ ] **Step 1: Viết e2e** (máy tính + điện thoại, như các spec khác):
  - `"bấm ảnh trong popup → lớp phóng to hiện ảnh gốc"`: mở `/?sp=<mã có ảnh>`, bấm `getByRole("button", { name: /Phóng to ảnh/ })`, expect `getByTestId("image-zoom")` visible và `img` bên trong có `src` = `imageUrl` của SP (lấy từ prisma).
  - `"Esc đóng lớp phóng to, popup vẫn mở; Esc lần nữa đóng popup"`: sau Esc thứ nhất `image-zoom` hidden, `product-dialog` visible, URL còn `sp=`; Esc thứ hai → URL không còn `sp=`.
  - `"nút ✕ của lớp phóng to có nhãn Đóng ảnh"`.
- [ ] **Step 2: Chạy** `npm run test:e2e -- photo-mode.spec.ts -g "phóng to"` → FAIL.
- [ ] **Step 3: Cài đặt `ImageZoom`.**
  - Ảnh bọc trong `<button type="button" aria-label="Phóng to ảnh {alt}">` có icon `ZoomIn` nhỏ ở góc dưới phải ảnh, `cursor-zoom-in`.
  - Bấm → mở một `<dialog data-testid="image-zoom">` thứ hai bằng `showModal()` (lồng trên popup SP, top layer xếp chồng nên Esc chỉ đóng lớp trên cùng). Nền `bg-black/90`, ảnh `object-contain max-h-dvh max-w-dvw`, nút ✕ `aria-label="Đóng ảnh"` góc trên phải, bấm nền cũng đóng.
  - Điện thoại: ảnh `touch-action: pinch-zoom` để chụm hai ngón phóng to bằng trình duyệt. Máy tính: bấm vào ảnh bật/tắt phóng 2× tại điểm bấm (`transform-origin` = vị trí con trỏ, `scale-200`, `cursor-zoom-out`).
  - `onCancel` của dialog phóng to: `e.stopPropagation()` + đóng chính nó, để `onCancel` của `ProductDialog` không chạy (React gắn listener cancel trên từng phần tử, nhưng chặn cho chắc).
  - Hiệu ứng mở: `animate-in fade-in zoom-in-95 duration-200`, tắt khi `motion-reduce`.
- [ ] **Step 4: Chạy lại** → PASS. Kiểm tay 375px và 1280px.
- [ ] **Step 5: Commit** `git commit -m "Popup: bấm ảnh để phóng to toàn màn hình"`

### Task 6: Vuốt / mũi tên / phím ←→ sang SP trước–sau

**Files:**
- Create: `src/server/services/product-neighbors.ts`, `src/components/catalog/product-swipe.tsx` (client)
- Modify: `src/components/catalog/product-detail-section.tsx`, `src/app/(public)/page.tsx`
- Test: `tests/integration/product-neighbors.test.ts` (dùng `catalog-fixture.ts` như các test catalog khác), `tests/e2e/photo-mode.spec.ts`

**Interfaces:**
- Consumes: `buildWhere`, `orderBySql`, `qtyJoinSql`, `findActiveStore` từ `src/server/services/catalog-filter.ts`; `visibleProductJoinsSql` từ `src/server/repositories/visibility.ts`; `ProductDetailSection({ sku, params })` (Task 2).
- Produces:
  ```ts
  export interface ProductNeighbors {
    prev: string | null; next: string | null;
    /** Ảnh gốc (image_url ?? thumb_url) của SP trước/sau — để tải trước. */
    prevImage: string | null; nextImage: string | null;
    position: number; total: number;
  }
  export function getProductNeighbors(params: CatalogParams, sku: string): Promise<ProductNeighbors | null>
  ```
  `null` khi `sku` không nằm trong danh sách đang lọc. `position` bắt đầu từ 1.
  `ProductSwipe({ neighbors, children }: { neighbors: ProductNeighbors | null; children: React.ReactNode })`.

- [ ] **Step 1: Viết integration test** `product-neighbors.test.ts`:
  - `it("sort sku: SP giữa có prev/next liền kề, position/total đúng")`.
  - `it("SP đầu → prev null; SP cuối → next null")`.
  - `it("theo sort price_desc và bộ lọc nhãn: thứ tự khớp listProducts với limit null")` — so `prev/next` của mọi SP với mảng `listProducts({...params, limit: null}).items.map(i => i.sku)`.
  - `it("sku không thuộc bộ lọc / không tồn tại / bị ẩn → null")`.
  - `it("chọn cửa hàng, all=false: chỉ đi qua SP cửa hàng đó có đặt")`.
- [ ] **Step 2: Chạy** `npm run test:integration -- product-neighbors` → FAIL.
- [ ] **Step 3: Cài đặt `getProductNeighbors`.** Một câu SQL, cùng `FROM … WHERE` như `listProducts` (tách phần dựng `from` trong `catalog.ts` thành hàm dùng chung `catalogFromSql(params, store)` thay vì chép lại):
  ```sql
  SELECT prev, next, prev_image, next_image, pos, total FROM (
    SELECT p.sku,
           LAG(p.sku)  OVER (ORDER BY <orderBySql>) AS prev,
           LEAD(p.sku) OVER (ORDER BY <orderBySql>) AS next,
           LAG(COALESCE(p.image_url, p.thumb_url))  OVER (ORDER BY <orderBySql>) AS prev_image,
           LEAD(COALESCE(p.image_url, p.thumb_url)) OVER (ORDER BY <orderBySql>) AS next_image,
           ROW_NUMBER() OVER (ORDER BY <orderBySql>) AS pos,
           COUNT(*) OVER () AS total
    <from>
  ) t WHERE upper(t.sku) = upper(<sku>)
  ```
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Viết e2e** (thêm vào `photo-mode.spec.ts`):
  - `"nút Sản phẩm sau → URL sp= đổi sang mã kế tiếp của lưới, tiêu đề popup đổi, có 2 / N"` (mã kế tiếp lấy từ `data-sku` của thẻ thứ 2).
  - `"phím → rồi ← quay về SP ban đầu; Back đóng popup luôn (không lùi từng SP)"`.
  - `"SP đầu: không có nút Sản phẩm trước"`.
  - `"đang ở ?xem=hinh: chuyển SP vẫn giữ xem=hinh và không có detail-summary"`.
  - điện thoại: `"vuốt trái trên ảnh → SP sau"` (dùng `page.touchscreen` hoặc dispatch `pointerdown/move/up`); `"vuốt ngang trên store-qty-table → sp= không đổi"`.
- [ ] **Step 6: Cài đặt.**
  - `ProductDetailSection`: gọi song song `getProductDetail` và `getProductNeighbors(params, sku)`, bọc `DetailBody` trong `ProductSwipe`.
  - `ProductSwipe`:
    - Nút tròn `ChevronLeft`/`ChevronRight` hai bên ảnh, `aria-label="Sản phẩm trước"` / `"Sản phẩm sau"`, ẩn khi `prev`/`next` null; dòng `"{position} / {total}"` cạnh mã SP.
    - Phím ←/→ khi popup mở và lớp phóng to (Task 5) không mở.
    - Vuốt: Pointer Events trên vùng ảnh + khối thông tin (đánh dấu `data-swipe-area`), bỏ qua nếu điểm bắt đầu nằm trong `[data-testid=store-qty-table]` hoặc dialog phóng to. Nội dung đi theo ngón tay (`translateX`), thả quá 60px hoặc vuốt nhanh → chuyển; chưa đủ → bật về. Dọc nhiều hơn ngang → coi là cuộn, không xử lý.
    - Chuyển = `router.replace("/" + buildCatalogQuery({ ...state, sp: target }), { scroll: false })` trong `startTransition`; trong lúc chờ làm mờ nhẹ nội dung (`opacity-60`); khi SP mới hiện thì trượt vào từ phía tương ứng (`slide-in-from-right-8` / `-left-8`, tắt khi `motion-reduce`).
    - Tải trước SP kế bên khi popup mở: `router.prefetch` URL của `prev`/`next`, và `new Image().src = prevImage/nextImage` để ảnh hiện ngay khi chuyển.
  - `page.tsx`: đổi `key={params.sp}` của `Suspense` popup thành `key="sp"` để khi chuyển SP trong transition, popup cũ giữ trên màn hình (không nháy khung chờ, `ProductDialog` không mount lại). Mở popup lần đầu vẫn hiện `ProductDetailFallback`.
- [ ] **Step 7: Chạy** e2e Task 6 + toàn bộ `npm run test:e2e` → PASS (đặc biệt `product-detail.spec.ts` vì đổi key Suspense). Kiểm tay 375px và 1280px.
- [ ] **Step 8: Cập nhật `docs/user-guide.md`** (mục của Task 4): vuốt/mũi tên để xem SP kế, bấm ảnh để phóng to.
- [ ] **Step 9: Tắt dev server / db:local / postgres; Commit** `git commit -m "Popup: vuốt hoặc bấm mũi tên sang SP trước/sau"`
