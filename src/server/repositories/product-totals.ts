import { Prisma, type PrismaClient } from "@prisma/client";
import type { QtyMetrics } from "@/lib/metrics";
import { prisma } from "@/server/db";

type Db = PrismaClient | Prisma.TransactionClient;

type Row = {
  product_id: string;
  qty_ordered: number;
  qty_received: number;
  qty_shortage: number;
  receive_rate: number | null;
};

/** Đọc số tổng (view product_totals) của các SP, theo productId. */
export async function getProductTotals(
  productIds: readonly string[],
  db: Db = prisma,
): Promise<Map<string, QtyMetrics>> {
  if (productIds.length === 0) return new Map();
  const rows = await db.$queryRaw<Row[]>`
    SELECT product_id, qty_ordered, qty_received, qty_shortage, receive_rate
    FROM product_totals
    WHERE product_id IN (${Prisma.join(productIds.map((id) => Prisma.sql`${id}::uuid`))})
  `;
  return new Map(
    rows.map((r) => [
      r.product_id,
      {
        ordered: r.qty_ordered,
        received: r.qty_received,
        shortage: r.qty_shortage,
        rate: r.receive_rate,
      },
    ]),
  );
}
