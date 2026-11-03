"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { UnauthorizedError, requireAdmin } from "@/server/auth/require-admin";
import { DomainError } from "@/server/errors";
import {
  createBrand,
  createCollection,
  createLine,
  createMaterial,
  createPriceRange,
  createProductType,
  createStore,
  deleteMasterItem,
  getHideImpact,
  renameBrand,
  renameMaterial,
  renamePriceRange,
  renameProductType,
  setActive,
  updateCollection,
  updateLine,
  updateStore,
  type HideImpact,
  type MasterKind,
} from "@/server/services/master-data";

const kindSchema = z.enum([
  "brand",
  "line",
  "collection",
  "material",
  "productType",
  "priceRange",
  "store",
]);
const idSchema = z.uuid();

const inputSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  brandId: z.string().optional(),
});
export type ItemInput = z.infer<typeof inputSchema>;

/**
 * Mọi thao tác ghi đều qua cổng này: requireAdmin() ở server (ADR-004 A3), lỗi nghiệp vụ
 * chuyển thành thông báo cho UI, thành công thì làm mới trang quản trị và trang xem.
 */
async function guarded<T>(
  run: () => Promise<{ message?: string; data?: T }>,
  opts: { write: boolean } = { write: true },
): Promise<{ ok: true; message?: string; data?: T } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const r = await run();
    if (opts.write) {
      revalidatePath("/admin/master-data");
      revalidatePath("/");
    }
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    }
    if (e instanceof DomainError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "Dữ liệu gửi lên không hợp lệ" };
    throw e;
  }
}

export async function createItemAction(kind: MasterKind, raw: ItemInput) {
  return guarded(async () => {
    const k = kindSchema.parse(kind);
    const input = inputSchema.parse(raw);
    switch (k) {
      case "brand":
        await createBrand(input.name ?? "");
        break;
      case "line":
        await createLine(input.brandId, input.name ?? "");
        break;
      case "collection":
        await createCollection(input.brandId, input.name ?? "");
        break;
      case "material":
        await createMaterial(input.name ?? "");
        break;
      case "productType":
        await createProductType(input.name ?? "");
        break;
      case "priceRange":
        await createPriceRange(input.name ?? "");
        break;
      case "store":
        await createStore({ code: input.code ?? "", name: input.name ?? "" });
        break;
    }
    return { message: "Đã thêm" };
  });
}

export async function updateItemAction(kind: MasterKind, id: string, raw: ItemInput) {
  return guarded(async () => {
    const k = kindSchema.parse(kind);
    const itemId = idSchema.parse(id);
    const input = inputSchema.parse(raw);
    switch (k) {
      case "brand":
        await renameBrand(itemId, input.name ?? "");
        break;
      case "line":
        await updateLine(itemId, { name: input.name });
        break;
      case "collection":
        await updateCollection(itemId, { name: input.name });
        break;
      case "material":
        await renameMaterial(itemId, input.name ?? "");
        break;
      case "productType":
        await renameProductType(itemId, input.name ?? "");
        break;
      case "priceRange":
        await renamePriceRange(itemId, input.name ?? "");
        break;
      case "store":
        await updateStore(itemId, { code: input.code, name: input.name });
        break;
    }
    return { message: "Đã lưu" };
  });
}

/** Bước 1 khi ẩn: lấy số SP bị ảnh hưởng để hiện hộp xác nhận. Không ghi gì. */
export async function getHideImpactAction(
  kind: MasterKind,
  id: string,
): Promise<{ ok: true; data: HideImpact } | { ok: false; error: string }> {
  const r = await guarded(
    async () => ({ data: await getHideImpact(kindSchema.parse(kind), idSchema.parse(id)) }),
    { write: false },
  );
  return r.ok ? { ok: true, data: r.data as HideImpact } : r;
}

/** Bước 2: ẩn (đã xác nhận) hoặc hiện lại. */
export async function setActiveAction(kind: MasterKind, id: string, active: boolean) {
  return guarded(async () => {
    const result = await setActive(kindSchema.parse(kind), idSchema.parse(id), active, {
      confirm: true,
    });
    if (result.status === "needs_confirmation") {
      throw new DomainError("CONFIRM_REQUIRED", "Cần xác nhận trước khi ẩn");
    }
    const message = active
      ? kind === "store"
        ? "Đã hiện lại cửa hàng"
        : `Đã hiện lại — ${result.affected} sản phẩm hiện lại trên trang xem`
      : kind === "store"
        ? "Đã ẩn cửa hàng — không còn cộng vào tổng"
        : `Đã ẩn — ${result.affected} sản phẩm ẩn khỏi trang xem`;
    return { message };
  });
}

export async function deleteItemAction(kind: MasterKind, id: string) {
  return guarded(async () => {
    await deleteMasterItem(kindSchema.parse(kind), idSchema.parse(id));
    return { message: "Đã xóa" };
  });
}
