import { z } from "zod";
import { DomainError } from "@/server/errors";

const MAX_NAME = 120;
const MAX_STORE_CODE = 30;

// Khoảng trắng đầu/cuối bị bỏ, khoảng trắng liên tiếp gộp thành một (mặc định kỹ thuật).
const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

export const nameSchema = z
  .string({ error: "Vui lòng nhập tên" })
  .transform(collapse)
  .pipe(
    z
      .string()
      .min(1, "Vui lòng nhập tên")
      .max(MAX_NAME, `Tên tối đa ${MAX_NAME} ký tự`),
  );

export const storeCodeSchema = z
  .string({ error: "Vui lòng nhập mã cửa hàng" })
  .transform(collapse)
  .pipe(
    z
      .string()
      .min(1, "Vui lòng nhập mã cửa hàng")
      .max(MAX_STORE_CODE, `Mã tối đa ${MAX_STORE_CODE} ký tự`),
  );

/** Parse bằng Zod, lỗi đầu tiên chuyển thành DomainError để UI/import hiển thị. */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, code: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new DomainError(code, r.error.issues[0].message);
  return r.data;
}
