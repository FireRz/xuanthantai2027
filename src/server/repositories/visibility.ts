import { Prisma } from "@prisma/client";

/**
 * SP "hiển thị được" trên trang xem (ARCHITECTURE §4.2, ADR-008 M2):
 * SP, nhãn, dòng đang hiện; BST và chất liệu (nếu có) đang hiện.
 * Ẩn danh mục cha → SP ẩn theo mà không đổi product.active.
 */
export const visibleProductWhere = {
  active: true,
  brand: { active: true },
  productLine: { active: true },
  AND: [
    { OR: [{ collectionId: null }, { collection: { active: true } }] },
    { OR: [{ materialId: null }, { material: { active: true } }] },
  ],
} satisfies Prisma.ProductWhereInput;

/**
 * Cùng điều kiện ở dạng SQL cho truy vấn thô (product_totals, lọc, đếm).
 * Yêu cầu đã JOIN với bí danh: p (product), b (brand), l (product_line),
 * c (collection, LEFT JOIN), m (material, LEFT JOIN).
 */
export const visibleProductSql = Prisma.sql`(
  p.active AND b.active AND l.active
  AND (p.collection_id IS NULL OR c.active)
  AND (p.material_id IS NULL OR m.active)
)`;

/** Các JOIN cần cho visibleProductSql, bắt đầu từ bảng product bí danh p. */
export const visibleProductJoinsSql = Prisma.sql`
  JOIN brand b ON b.id = p.brand_id
  JOIN product_line l ON l.id = p.product_line_id
  LEFT JOIN collection c ON c.id = p.collection_id
  LEFT JOIN material m ON m.id = p.material_id
`;
