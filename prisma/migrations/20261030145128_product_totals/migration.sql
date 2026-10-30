-- Số tổng theo SP (ARCHITECTURE §4.3, ADR-007) — cùng công thức với src/lib/metrics.ts.
-- Chỉ cộng cửa hàng đang hiện; thiếu và tỷ lệ tính trên số tổng.
-- Mọi SP đều có một dòng (SP chưa có SL → 0 / 0 / NULL); lọc "SP visible" ở truy vấn dùng view.
CREATE VIEW "product_totals" AS
SELECT
  t.product_id,
  t.qty_ordered,
  t.qty_received,
  GREATEST(t.qty_ordered - t.qty_received, 0) AS qty_shortage,
  CASE
    WHEN t.qty_ordered = 0 THEN NULL
    ELSE LEAST(t.qty_received::double precision / t.qty_ordered, 1)
  END AS receive_rate
FROM (
  SELECT
    p.id AS product_id,
    COALESCE(SUM(q.qty_ordered) FILTER (WHERE s.active), 0)::int AS qty_ordered,
    COALESCE(SUM(q.qty_received) FILTER (WHERE s.active), 0)::int AS qty_received
  FROM "product" p
  LEFT JOIN "store_product_qty" q ON q.product_id = p.id
  LEFT JOIN "store" s ON s.id = q.store_id
  GROUP BY p.id
) t;
