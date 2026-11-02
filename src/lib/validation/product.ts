import { z } from "zod";

const MAX_SKU = 50;
const MAX_NAME = 200;
const MAX_PRICE = 2_000_000_000; // vừa trong int32 của CSDL

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

/** Mã SP: bỏ khoảng trắng đầu/cuối (ADR-003). Không cho ký tự làm hỏng tên file ảnh / đường dẫn. */
export const skuSchema = z
  .string({ error: "Vui lòng nhập mã sản phẩm" })
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, "Vui lòng nhập mã sản phẩm")
      .max(MAX_SKU, `Mã tối đa ${MAX_SKU} ký tự`)
      .regex(/^[^\/:*?"<>|\s]+$/, 'Mã không được chứa khoảng trắng hoặc ký tự \ / : * ? " < > |'),
  );

const requiredId = (message: string) => z.uuid({ error: message });

/** Chuỗi/ID tùy chọn: rỗng hoặc null → null (không thuộc / không có). */
const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || v.trim() === "" ? null : v.trim()))
  .pipe(z.uuid({ error: "Giá trị chọn không hợp lệ" }).nullable())
  .optional()
  .default(null);

const optionalName = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null || collapse(v) === "" ? null : collapse(v)))
  .pipe(z.string().max(MAX_NAME, `Tên tối đa ${MAX_NAME} ký tự`).nullable())
  .optional()
  .default(null);

/** Giá VND: số nguyên ≥ 0 (ADR-008 P5). Rỗng/null → không có giá. Nhận cả chuỗi từ form. */
const optionalPrice = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v == null) return null;
    if (typeof v === "string") {
      const t = v.trim().replace(/[.,\s]/g, "");
      if (t === "") return null;
      if (!/^-?\d+$/.test(t)) {
        ctx.addIssue({ code: "custom", message: "Giá phải là số nguyên VND" });
        return z.NEVER;
      }
      return Number(t);
    }
    return finiteOrIssue(v, ctx);
  })
  .pipe(
    z
      .number()
      .int("Giá phải là số nguyên VND")
      .min(0, "Giá không được âm")
      .max(MAX_PRICE, "Giá quá lớn")
      .nullable(),
  )
  .optional()
  .default(null);

function finiteOrIssue(v: number, ctx: z.RefinementCtx): number {
  if (!Number.isFinite(v)) {
    ctx.addIssue({ code: "custom", message: "Giá phải là số nguyên VND" });
    return z.NEVER;
  }
  return v;
}

/** Trường dùng chung cho tạo và sửa (không có mã). Bắt buộc: Nhãn, Dòng. */
const editableFields = {
  name: optionalName,
  brandId: requiredId("Vui lòng chọn nhãn hàng"),
  productLineId: requiredId("Vui lòng chọn dòng hàng"),
  collectionId: optionalId,
  materialId: optionalId,
  priceRangeId: optionalId,
  priceVnd: optionalPrice,
};

/** Tạo SP: bắt buộc Mã, Nhãn, Dòng (ADR-008 P4). */
export const createProductSchema = z.object({ sku: skuSchema, ...editableFields });
export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Sửa SP: KHÔNG có `sku` — mã không sửa được (ADR-008 P1). Trường `sku` gửi kèm bị bỏ qua
 * (z.object mặc định loại khóa lạ), nên không thể đổi mã qua đường này.
 */
export const updateProductSchema = z.object(editableFields);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
