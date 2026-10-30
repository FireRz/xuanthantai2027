import type { Prisma, PrismaClient } from "@prisma/client";
import { DomainError } from "@/server/errors";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ClassificationInput {
  brandId: string;
  productLineId: string;
  collectionId?: string | null;
}

/**
 * Dòng và BST phải cùng nhãn với SP (ADR-003, BR-06). CSDL cũng chặn bằng
 * khóa ngoại kép; kiểm tra ở đây để báo lỗi dễ hiểu trước khi ghi.
 */
export async function assertSameBrand(db: Db, input: ClassificationInput): Promise<void> {
  const line = await db.productLine.findUnique({
    where: { id: input.productLineId },
    select: { brandId: true, name: true },
  });
  if (!line) throw new DomainError("LINE_NOT_FOUND", "Dòng hàng không tồn tại");
  if (line.brandId !== input.brandId) {
    throw new DomainError(
      "LINE_BRAND_MISMATCH",
      `Dòng hàng "${line.name}" không thuộc nhãn của SP`,
    );
  }
  if (input.collectionId) {
    const col = await db.collection.findUnique({
      where: { id: input.collectionId },
      select: { brandId: true, name: true },
    });
    if (!col) throw new DomainError("COLLECTION_NOT_FOUND", "Bộ sưu tập không tồn tại");
    if (col.brandId !== input.brandId) {
      throw new DomainError(
        "COLLECTION_BRAND_MISMATCH",
        `Bộ sưu tập "${col.name}" không thuộc nhãn của SP`,
      );
    }
  }
}
