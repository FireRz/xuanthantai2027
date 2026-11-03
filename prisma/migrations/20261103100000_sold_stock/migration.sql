-- SL bán và SL tồn theo (SP, cửa hàng); view số tổng thêm hai cột tương ứng.
ALTER TABLE "store_product_qty"
  ADD COLUMN "qty_sold" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qty_stock" INTEGER NOT NULL DEFAULT 0;

DROP VIEW "product_totals";
CREATE VIEW "product_totals" AS
SELECT
  t.product_id,
  t.qty_ordered,
  t.qty_received,
  GREATEST(t.qty_ordered - t.qty_received, 0) AS qty_shortage,
  CASE
    WHEN t.qty_ordered = 0 THEN NULL
    ELSE LEAST(t.qty_received::double precision / t.qty_ordered, 1)
  END AS receive_rate,
  t.qty_sold,
  t.qty_stock
FROM (
  SELECT
    p.id AS product_id,
    COALESCE(SUM(q.qty_ordered) FILTER (WHERE s.active), 0)::int AS qty_ordered,
    COALESCE(SUM(q.qty_received) FILTER (WHERE s.active), 0)::int AS qty_received,
    COALESCE(SUM(q.qty_sold) FILTER (WHERE s.active), 0)::int AS qty_sold,
    COALESCE(SUM(q.qty_stock) FILTER (WHERE s.active), 0)::int AS qty_stock
  FROM "product" p
  LEFT JOIN "store_product_qty" q ON q.product_id = p.id
  LEFT JOIN "store" s ON s.id = q.store_id
  GROUP BY p.id
) t;
