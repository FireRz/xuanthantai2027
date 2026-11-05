# Hướng dẫn sử dụng — Xuân Thần Tài 2027

Hai phần: **A. Người xem (cửa hàng)** và **B. Quản trị**. Tên nút, tên mục dưới đây trùng với giao diện.

---

## A. Dành cho người xem (cửa hàng)

Không cần đăng nhập. Mở đường link được gửi; dùng được trên điện thoại và máy tính.

### A1. Xem danh mục

- Trang chủ hiện các sản phẩm (SP): ảnh, mã, tên, tuổi vàng, giá bán lẻ, số lượng **Đặt / Về / Còn thiếu**, tỷ lệ về và nhãn trạng thái màu.
- Nút **Lưới** / **Bảng** đổi cách hiển thị. Cuối danh sách bấm **Xem thêm** để tải tiếp.
- Bấm vào một SP để mở cửa sổ chi tiết: ảnh lớn và bảng số lượng **theo từng cửa hàng**. Bấm **Đóng** để quay lại.

### A2. Xem hàng của cửa hàng mình

1. Ở ô **Cửa hàng của bạn**, chọn cửa hàng của mình.
2. Danh sách chỉ còn SP mà cửa hàng bạn **có đặt**, và các con số là của riêng cửa hàng bạn.
3. Muốn xem cả SP chưa đặt: bật **Xem tất cả SP**.
4. Chọn **Tất cả cửa hàng (tổng hệ thống)** để quay về số tổng.

### A2b. Xem theo khu vực (ASM)

1. Ở ô **Khu vực** (đứng trước ô cửa hàng), chọn khu vực, ví dụ **Khu vực 2**.
2. Danh sách chỉ còn SP mà các cửa hàng trong khu vực **có đặt**; các con số là **tổng của các cửa hàng trong khu vực**. Bật **Xem tất cả SP** để xem cả SP khu vực chưa đặt.
3. Ô cửa hàng lúc này chỉ còn các cửa hàng của khu vực đó; chọn một cửa hàng để xem riêng cửa hàng ấy. Chọn **Mọi khu vực** để quay về tổng hệ thống.
4. Chi tiết SP: bảng số lượng chỉ liệt kê cửa hàng của khu vực, dòng TỔNG là tổng khu vực.
5. Gửi link cho ASM: link giữ khu vực đã chọn (có `kv=2` trên địa chỉ). Trang **Phân tích** cũng lọc được theo khu vực và có chiều so sánh **Khu vực**.

Ô Khu vực chỉ hiện khi đã có ít nhất một cửa hàng được gán khu vực (xem B2).

### A3. Lọc, tìm, sắp xếp

- **Bộ lọc**: Nhãn hàng, Dòng hàng, Bộ sưu tập (có mục "Không thuộc BST"), Tuổi vàng, Chủng loại, Khung giá. Chọn được nhiều giá trị; bên cạnh mỗi lựa chọn có số SP. Trên điện thoại bấm **Bộ lọc** để mở bảng lọc.
- **Tìm mã SP**: gõ mã (không phân biệt hoa thường) vào ô **Tìm mã SP**.
- **Sắp xếp**: Mã SP A→Z (mặc định), Mới cập nhật, Giá thấp → cao, Giá cao → thấp, Còn thiếu nhiều nhất.

### A4. Xuất Excel

Bấm **Xuất Excel** để tải file chứa đúng danh sách đang lọc (kèm số lượng của cửa hàng bạn chọn, nếu có).

### A4b. Chỉ xem hình — gửi link cho người chỉ cần xem mẫu

Với người chỉ cần xem hình và thông tin sản phẩm (không cần số Đặt / Về / Thiếu / Bán / Tồn), gửi link có thêm `?xem=hinh`, ví dụ `https://<tên miền>/?xem=hinh`. Trang mở ra chỉ có ảnh, mã, tên, nhãn, dòng, BST, tuổi vàng, chủng loại và giá; không có thanh tiến độ, trạng thái, bảng số lượng theo cửa hàng, nút Xuất Excel hay kiểu sắp xếp theo thiếu / bán.

- Bạn cũng có thể tự bật bằng công tắc **Ẩn số lượng / Chỉ xem hình** ở cuối thanh cửa hàng (cạnh nút Tìm, luôn thấy khi cuộn); chế độ giữ nguyên khi lọc, tìm mã, mở chi tiết, bấm Xem thêm.
- Đây chỉ là cách hiển thị gọn, không phải phân quyền: người nhận vẫn có thể gạt lại công tắc để tắt và xem số lượng.
- Trong chi tiết sản phẩm (cả hai chế độ): bấm ảnh để phóng to (Esc hoặc ✕ để thu lại), dùng nút mũi tên (máy tính: hai bên ngoài khung chi tiết; điện thoại: cạnh dòng `2 / 150`) hoặc phím ← / → (vuốt trái / phải trên ảnh hoặc phần thông tin trên điện thoại) để sang sản phẩm trước / sau. Thứ tự đúng như danh sách đang xem (cùng bộ lọc, tìm mã, cửa hàng, sắp xếp), dòng `2 / 150` cạnh mã cho biết đang ở sản phẩm thứ mấy. Vuốt ngang trên bảng số lượng theo cửa hàng chỉ cuộn bảng. Chuyển sản phẩm không thêm lịch sử: bấm Back hoặc ✕ là đóng chi tiết luôn.

### A5. Cách tính cần biết

- **Còn thiếu** = Đặt − Về, không âm (Về nhiều hơn Đặt thì Còn thiếu = 0).
- **Tỷ lệ về** = Về / Đặt, tối đa 100%; chưa đặt thì hiện "—".
- Số tổng hệ thống = cộng số của mọi cửa hàng đang hiển thị.

### A6. Trang phân tích

Trang `/phan-tich` cho xem số tổng, số mã theo trạng thái, bảng so sánh theo nhóm và top 10 mã, theo đúng bộ lọc của danh mục. Trang có mật khẩu xem chung; chân trang danh mục có link nhỏ **Phân tích**.

**Quản trị đặt mật khẩu:** **Tài khoản → Mật khẩu xem phân tích**, nhập mật khẩu mới (tối thiểu 10 ký tự) rồi **Lưu**. Đổi mật khẩu thì mọi người phải nhập lại; **Tắt trang phân tích** xóa mật khẩu và đóng trang. Nhập sai 5 lần liên tiếp trong 15 phút thì trang khóa tạm (dùng chung cho mọi người xem).

**Gửi cho người cần xem:** gửi link `https://<tên miền>/phan-tich` kèm mật khẩu (nên gửi hai tin riêng). Sau khi nhập đúng, trình duyệt nhớ 30 ngày. Link có kèm bộ lọc (ví dụ `?brand=...&nhom=line`) mở đúng góc nhìn đó sau khi nhập mật khẩu.

**Ý nghĩa các chỉ số:**
- **Số mã**: số sản phẩm đang tính. **Đặt / Về / Bán / Tồn**: cộng số lượng của các mã đó. **Thiếu**: cộng phần còn thiếu của từng mã (Đặt − Về, không âm), nên mã về dư không bù cho mã thiếu.
- **% hàng về** = tổng Về / tổng Đặt, tối đa 100%. **% bán** = tổng Bán / (tổng Bán + tổng Tồn). Cả hai tính **trên tổng**, không phải trung bình cộng các tỷ lệ của từng mã hay từng dòng; chưa đặt thì hiện "—".
- **Thanh trạng thái**: số mã Đủ hàng, Còn thiếu, Chưa về, Không đặt (chỉ để xem, không bấm được); **Hết hàng** là số mã có Tồn bằng 0.
- **So sánh theo**: Nhãn, Dòng, BST, Tuổi vàng, Chủng loại, Khung giá hoặc Cửa hàng. Bấm tên một dòng trong bảng để thêm giá trị đó vào bộ lọc; bấm tiêu đề cột để sắp xếp. Mã thiếu thuộc tính nằm ở dòng "Ngoài bộ sưu tập", "Chưa có tuổi vàng"... Tổng các dòng bằng số tổng.
- **Top 10**: "Bán chạy nhất" và "Còn thiếu nhiều nhất"; bấm một mã để mở chi tiết ngay trên trang phân tích.

**Khi so sánh theo Cửa hàng:** một mã có thể có mặt ở nhiều cửa hàng nên tổng **Số mã** và **Thiếu** của các dòng cửa hàng **không bằng** số tổng (số tổng đếm mỗi mã một lần). Đây là bình thường.

---

## B. Dành cho quản trị

Vào `<địa chỉ web>/login`, đăng nhập bằng tên đăng nhập và mật khẩu. Menu: **Danh mục · Sản phẩm · Ảnh · Nhập Excel · Số lượng · Xuất dữ liệu · Phân tích · Tài khoản**.

### B1. Thứ tự nhập dữ liệu lần đầu

Làm đúng thứ tự, vì file Excel chỉ chọn được những giá trị đã có:

1. **Danh mục → Cửa hàng**: nhập mã (duy nhất) và tên từng cửa hàng.
2. **Danh mục → Nhãn hàng**: tạo nhãn.
3. Dưới từng nhãn: tạo **Dòng hàng** (bắt buộc, mỗi SP thuộc một dòng) và **Bộ sưu tập** (không bắt buộc).
4. **Tuổi vàng**, **Chủng loại** và **Khung giá** (không bắt buộc, dùng để lọc). Chủng loại (nhẫn, dây chuyền, lắc tay…) gõ đúng tên ở cột "Chủng loại" trong Excel; chưa có thì import tự tạo.
5. **Nhập Excel**: tải file mẫu → điền → nhập (B3).
6. **Ảnh**: tải ảnh hàng loạt (B4).
7. Đối chiếu số liệu trên trang xem với file nguồn.

Trang **Danh mục** có hướng dẫn từng bước và đánh dấu bước đã xong.

### B2. Quản lý danh mục

- Thêm bằng ô "Thêm …" ở mỗi mục; sửa tên ngay trên dòng.
- **Xóa** chỉ được khi chưa có SP hay số lượng nào dùng. Nếu đang dùng, hãy **Ẩn**.
- **Khu vực của cửa hàng**: ở **Danh mục → Cửa hàng**, ô **Khu vực** khi thêm hoặc **Sửa** một cửa hàng. Gõ tự do (ví dụ `1`, `2`, `3`, `4` — trang xem hiện là "Khu vực 1"…); ô gợi ý các khu vực đã nhập để tránh gõ lệch. Để trống = chưa thuộc khu vực nào.
- **Ẩn** nhãn / dòng / BST / tuổi vàng → các SP thuộc nó cũng ẩn khỏi trang xem (hộp thoại cho biết bao nhiêu SP bị ảnh hưởng). **Ẩn cửa hàng** → số của cửa hàng đó không còn cộng vào tổng. Hiện lại là trở về như cũ.
- Hệ thống không xóa dữ liệu vĩnh viễn; SP cũng chỉ ẩn/hiện, và **mã SP không sửa được** sau khi tạo.

### B3. Nhập Excel

1. Vào **Nhập Excel → Tải file mẫu**. File có sheet:
   - **SanPham** — mỗi SP một dòng: Mã SP, Tên SP, Nhãn hàng, Dòng hàng, Bộ sưu tập, Tuổi vàng, Chủng loại, Khung giá, Giá bán lẻ.
   - **SoLuong** — mỗi cặp (SP, cửa hàng) một dòng: Mã SP, Mã cửa hàng, SL đặt, SL đã về.
   - **HuongDan** — giải thích từng cột. Các cột Nhãn, Dòng, BST, Tuổi vàng, Chủng loại, Khung giá, Mã cửa hàng có ô chọn từ danh sách.
2. Điền file, lưu dạng **.xlsx**. Quy tắc:
   - Mã SP không trùng, không có khoảng trắng; mã chưa có trên web → tạo SP mới (SP mới cần Nhãn hàng và Dòng hàng).
   - Dòng phải thuộc đúng nhãn của SP; BST cũng vậy.
   - Số lượng là số nguyên ≥ 0; SL về được phép lớn hơn SL đặt.
   - **Ô để trống = giữ nguyên**. Muốn về 0 thì gõ 0. Giá trị có trong file **ghi đè** số cũ.
   - Cửa hàng chưa có trên web sẽ báo lỗi → tạo ở **Danh mục** trước. Nhãn, dòng, BST, tuổi vàng, khung giá chưa có sẽ được tự tạo khi áp dụng (bản xem trước liệt kê sẵn).
3. **Chọn file Excel**. Hệ thống hiện bản **xem trước**: thẻ tổng hợp (SP mới, SP thay đổi, dòng SL thay đổi, lỗi), các tab Tất cả / SP mới / Thay đổi / Lỗi, từng thay đổi dạng **cũ → mới**.
4. Có lỗi: bảng lỗi ghi rõ **sheet, dòng, cột, lý do**. Sửa file rồi chọn lại (**Nhập file khác**). Nút **Áp dụng** bị khóa cho tới khi hết lỗi.
5. Hết lỗi, kiểm tra lại số liệu → bấm **Áp dụng**. Áp dụng là "tất cả hoặc không": nếu lỗi giữa chừng, dữ liệu không đổi.

### B4. Tải ảnh hàng loạt

1. Đặt tên file ảnh = **mã SP** + đuôi `.jpg`, `.png` hoặc `.webp` (VD `NTT001.jpg`). Không phân biệt hoa thường.
2. Mỗi SP **một ảnh**; tải lại cùng mã là thay ảnh. Hai file cùng mã → báo "trùng mã", không file nào được gắn.
3. Vào **Ảnh**, kéo thả nhiều ảnh, một thư mục hoặc một file `.zip` (thư mục con trong zip được chấp nhận).
4. Xem **Kết quả đối chiếu**: Khớp / Không khớp mã SP nào / Trùng mã / Không phải ảnh / SP chưa có ảnh. Xử lý các mục chưa khớp rồi tải.
5. Ảnh được thu nhỏ ngay trên máy bạn nên ảnh gốc lớn vẫn tải nhanh. Theo dõi thanh tiến độ cho tới khi báo **Xong**.
6. Tìm SP còn thiếu ảnh: **Sản phẩm** → tick "Chỉ SP chưa có ảnh". Đổi ảnh riêng cho một SP: mở SP đó trong **Sản phẩm**.

### B5. Thêm / sửa từng sản phẩm

**Sản phẩm → Thêm sản phẩm** (hoặc bấm vào một SP để sửa): chọn Nhãn trước rồi mới chọn được Dòng và BST của nhãn đó; bấm **Lưu thay đổi**. Lọc danh sách theo **Đang hiện / Đang ẩn**.

### B6. Sửa nhanh số lượng

**Số lượng** có hai chế độ: **Theo sản phẩm** (sửa SL đặt / SL đã về của một SP ở mọi cửa hàng) và **Theo cửa hàng** (chọn cửa hàng, sửa nhiều SP). Nhập số nguyên ≥ 0 rồi bấm **Lưu thay đổi**; số mới ghi đè số cũ.

### B7. Xuất – sửa – nhập lại

1. **Xuất dữ liệu** → tải file (cùng khuôn với file mẫu, gồm mọi SP đang hoạt động và mọi cặp SP × cửa hàng đã có số liệu). Với nhiều nghìn SP có thể mất vài chục giây.
2. Sửa trong Excel, giữ nguyên tên sheet và tiêu đề cột.
3. **Nhập Excel** như B3. Dòng nào không đổi sẽ không bị tính là thay đổi. SP đang ẩn không có trong file xuất và không bị ảnh hưởng khi nhập lại.

### B8. Tài khoản và mật khẩu

- Đổi mật khẩu: **Tài khoản → Đổi mật khẩu** (nhập mật khẩu hiện tại, mật khẩu mới ≥ 10 ký tự, nhập lại).
- Nhập sai 5 lần liên tiếp: tài khoản bị khóa tạm 15 phút.
- **Quên mật khẩu** (không đăng nhập được): người phát triển đặt lại bằng lệnh `npm run admin:set-password` với chuỗi kết nối CSDL production (xem `docs/deploy.md`, bước 9). Mật khẩu cũ hết hiệu lực, các phiên cũ bị đăng xuất, khóa tạm được gỡ. Không gửi mật khẩu qua chat hay email.

### B9. Xử lý sự cố thường gặp

| Hiện tượng                                     | Cách xử lý                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Nhập Excel báo "chưa có" nhãn / dòng / cửa hàng… | Tạo ở **Danh mục** trước rồi nhập lại                            |
| Báo dòng không thuộc nhãn                      | Kiểm tra cột Nhãn hàng và Dòng hàng của SP có khớp nhau           |
| Không chọn được file                           | Lưu lại dạng .xlsx (không dùng .xls / .csv)                       |
| Ảnh "Không khớp mã SP nào"                     | Tên file chưa đúng mã, hoặc SP chưa được tạo (nhập Excel trước)   |
| SP không hiện ở trang xem                      | Kiểm tra SP / nhãn / dòng / BST / tuổi vàng có đang bị ẩn         |
| Số tổng ít hơn dự kiến                         | Có thể một cửa hàng đang bị ẩn (số của nó không cộng vào tổng)    |
