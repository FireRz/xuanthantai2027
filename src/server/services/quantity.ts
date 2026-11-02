import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";

/**
 * Service số lượng (ADR-002): SL đặt / SL đã về theo (SP, cửa hàng), cập nhật là GHI ĐÈ (D4).
 * Trường không truyền (undefined) = giữ nguyên (R6); SL về > SL đặt vẫn được phép (D8).
 */

export interface QuantityInput {
  ordered?: number;
  received?: number;
}

export interface QuantityChange extends QuantityInput {
  productId: string;
  storeId: string;
}

const MAX_QTY = 2_000_000_000; // vừa trong int32 của CSDL

function checkQty(label: string, v: number | undefined): void {
  if (v === undefined) return;
  if (!Number.isInteger(v) || v < 0 || v > MAX_QTY) {
    throw new DomainError("QTY_INVALID", `${label} phải là số nguyên ≥ 0`);
  }
}

export function assertValidQuantity(input: QuantityInput): void {
  checkQty("SL đặt", input.ordered);
  checkQty("SL đã về", input.received);
}

async function upsertOne(
  db: Prisma.TransactionClient,
  { productId, storeId, ordered, received }: QuantityChange,
) {
  return db.storeProductQty.upsert({
    where: { productId_storeId: { productId, storeId } },
    // Cặp mới: trường không truyền = 0 (mặc định của cột).
    create: { productId, storeId, qtyOrdered: ordered ?? 0, qtyReceived: received ?? 0 },
    update: { qtyOrdered: ordered, qtyReceived: received },
  });
}

/** Ghi đè SL của một cặp (SP, cửa hàng); tạo mới nếu chưa có. */
export async function setQuantity(productId: string, storeId: string, input: QuantityInput) {
  assertValidQuantity(input);
  try {
    return await upsertOne(prisma, { productId, storeId, ...input });
  } catch (e) {
    throw mapMissingRef(e);
  }
}

/**
 * Ghi đè nhiều cặp trong MỘT transaction (sửa nhanh trên web, T08.4) — kết quả giống nhập file (AC9).
 * Một cặp lỗi → không cặp nào được ghi.
 */
export async function setQuantities(changes: QuantityChange[]) {
  for (const c of changes) assertValidQuantity(c);
  try {
    return await prisma.$transaction(async (tx) => {
      const out = [];
      for (const c of changes) out.push(await upsertOne(tx, c));
      return out;
    });
  } catch (e) {
    throw mapMissingRef(e);
  }
}

function mapMissingRef(e: unknown): unknown {
  // P2003: vi phạm khóa ngoại = SP hoặc cửa hàng không tồn tại.
  if (typeof e === "object" && e && (e as { code?: string }).code === "P2003") {
    return new DomainError("QTY_REF_NOT_FOUND", "Sản phẩm hoặc cửa hàng không tồn tại");
  }
  return e;
}
