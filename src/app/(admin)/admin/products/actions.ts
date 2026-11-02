"use server";

import { z } from "zod";
import { createProduct, setProductsActive, updateProduct } from "@/server/services/product";
import { attachProductImage } from "@/server/services/product-image";
import { guarded } from "./guard";

const idSchema = z.uuid();

/** Gắn / thay ảnh sau khi trình duyệt đã tải lên Blob. */
export async function attachImageAction(productId: string, imageUrl: string, thumbUrl: string) {
  return guarded(() =>
    attachProductImage(
      idSchema.parse(productId),
      z.string().max(2000).parse(imageUrl),
      z.string().max(2000).parse(thumbUrl),
    ),
  );
}

export async function createProductAction(raw: unknown) {
  return guarded(async () => {
    const p = await createProduct(raw);
    return { id: p.id };
  });
}

export async function updateProductAction(id: string, raw: unknown) {
  return guarded(async () => {
    await updateProduct(idSchema.parse(id), raw);
    return { id };
  });
}

export async function setActiveAction(ids: string[], active: boolean) {
  return guarded(async () => {
    const list = z.array(idSchema).max(500).parse(ids);
    const count = await setProductsActive(list, z.boolean().parse(active));
    return { count };
  });
}
