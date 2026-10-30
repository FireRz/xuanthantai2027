# ADR-003 — Quan hệ Nhãn hàng / Dòng hàng / Bộ sưu tập & Mã sản phẩm

- **Trạng thái:** Đã chốt (2026-10-30)
- **Nguồn:** Câu trả lời cho Q-04, Q-09 và câu hỏi bổ sung "SP – BST"

## Quyết định
| # | Nội dung |
|---|----------|
| C1 | **Dòng hàng thuộc một Nhãn hàng.** Một nhãn có nhiều dòng. |
| C2 | **Bộ sưu tập thuộc một Nhãn hàng.** Một nhãn có nhiều BST. |
| C3 | Một BST có thể chứa **nhiều dòng hàng** (quan hệ suy ra qua sản phẩm, không cần bảng nối riêng). |
| C4 | Mỗi sản phẩm thuộc **đúng 1 nhãn, đúng 1 dòng** và **0 hoặc 1 BST**. Có sản phẩm **không thuộc BST nào**. |
| C5 | **Mã sản phẩm duy nhất**, không có biến thể. Số lượng tính theo mã. |

## Hệ quả cho mô hình dữ liệu
```
BRAND(id, name, active)
PRODUCT_LINE(id, brand_id → BRAND, name, active)
COLLECTION(id, brand_id → BRAND, name, active)
PRODUCT(id, sku UNIQUE, brand_id, product_line_id, collection_id NULLABLE, active, updated_at)
```
**Ràng buộc toàn vẹn** (kiểm tra ở service layer và trong bước import):
- `PRODUCT_LINE.brand_id = PRODUCT.brand_id`
- Nếu `collection_id` khác null: `COLLECTION.brand_id = PRODUCT.brand_id`

## Hệ quả cho bộ lọc
- Bộ lọc **liên động**: chọn Nhãn → danh sách Dòng và BST chỉ còn các giá trị thuộc nhãn đó.
- Chọn BST → danh sách Dòng chỉ còn các dòng có sản phẩm trong BST đó (vì C3).

## Bổ sung (2026-10-30)
- Tên dòng / BST duy nhất trong cùng nhãn, được trùng giữa các nhãn *(mặc định kỹ thuật)*.
- Bộ lọc BST có lựa chọn "Không thuộc BST" (ADR-007).
- Mã SP không được sửa sau khi tạo (ADR-008 P1). Mã được lưu nguyên văn, so khớp khi tìm kiếm/nhập file không phân biệt hoa/thường và bỏ khoảng trắng đầu/cuối *(mặc định kỹ thuật)*.

Không còn câu hỏi mở.
