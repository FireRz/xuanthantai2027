# ADR-002 — Mô hình số lượng

- **Trạng thái:** Đã chốt (2026-10-30)
- **Nguồn:** Câu trả lời của chủ dự án cho Q-01, Q-02, Q-22 và câu hỏi bổ sung "số tổng", "hiển thị SL"

## Quyết định
| # | Nội dung | Câu hỏi |
|---|----------|---------|
| D1 | Số lượng đặt và số lượng đã về được lưu **theo từng cửa hàng** cho từng sản phẩm | Q-01 |
| D2 | **Số tổng toàn hệ thống = tổng của tất cả cửa hàng**, được tính tự động, không nhập riêng | Bổ sung |
| D3 | "Đã về" là **một con số tổng** cho mỗi cặp (sản phẩm, cửa hàng), không ghi theo đợt | Q-02 |
| D4 | Cập nhật số lượng là **ghi đè**: giá trị nhập vào thay thế giá trị cũ | Q-22 |
| D5 | Trang xem hiển thị **số tổng và số chi tiết của mọi cửa hàng**; có **bộ lọc theo cửa hàng** để mỗi cửa hàng xem hàng của mình | Bổ sung |

## Hệ quả cho mô hình dữ liệu
```
STORE(id, code UNIQUE, name, active)
STORE_PRODUCT_QTY(product_id, store_id, qty_ordered, qty_received, updated_at)
    PK (product_id, store_id)
Tổng SP = SUM(qty_ordered), SUM(qty_received) theo product_id  (view hoặc truy vấn tổng hợp)
```
- Bảng `PRODUCT` **không** chứa cột số lượng.
- Không có bảng đợt hàng về (`RECEIPT`) — bỏ T05.5, T08.3.

## Bổ sung (2026-10-30)
| # | Nội dung | Câu hỏi |
|---|----------|---------|
| D6 | Lọc theo cửa hàng X: **mặc định chỉ hiện SP mà X có SL đặt > 0**; có **công tắc "Xem tất cả SP"** để hiện mọi SP kèm số của X (SP không đặt hiển thị 0) | Q-24 |
| D7 | Danh sách cửa hàng do quản trị **tự nhập trên web**; không cần chốt ở giai đoạn Planning; file Excel **không tự tạo** cửa hàng mới | Q-25 |

| D8 | SL về > SL đặt: **cho phép**; còn thiếu = 0 (công thức đầy đủ ở ADR-007) | Q-07 |
| D9 | Ô SL để trống trong file = giữ nguyên (ADR-008 R6) | R6 |

Không còn câu hỏi mở.
