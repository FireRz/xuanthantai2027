"use server";

import { z } from "zod";
import { setQuantities } from "@/server/services/quantity";
import { guarded } from "../products/guard";

const qty = z.number().int().min(0).max(2_000_000_000).optional();
const changeSchema = z.object({
  productId: z.uuid(),
  storeId: z.uuid(),
  ordered: qty,
  received: qty,
});

/** Lưu một lô thay đổi SL (ghi đè, chỉ các ô đã sửa) — requireAdmin() nằm trong `guarded`. */
export async function saveQuantitiesAction(changes: unknown) {
  return guarded(async () => {
    const list = z.array(changeSchema).min(1).max(500).parse(changes);
    await setQuantities(list);
    return { count: list.length };
  });
}
