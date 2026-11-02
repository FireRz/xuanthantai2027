"use server";

import { z } from "zod";
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
