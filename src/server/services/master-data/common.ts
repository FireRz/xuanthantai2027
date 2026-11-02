import { Prisma } from "@prisma/client";
import { nameSchema, parseOrThrow } from "@/lib/validation/master-data";
import { DomainError } from "@/server/errors";

export const parseName = (raw: unknown) => parseOrThrow(nameSchema, raw, "NAME_INVALID");

export const duplicateName = (name: string) =>
  new DomainError("NAME_DUPLICATE", `Tên "${name}" đã tồn tại`);

/**
 * Chạy thao tác ghi; nếu CSDL báo vi phạm unique (hai người ghi cùng lúc, lọt qua bước
 * kiểm tra trước) thì đổi thành lỗi nghiệp vụ dễ hiểu.
 */
export async function mapUnique<T>(run: () => Promise<T>, onDuplicate: () => DomainError) {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw onDuplicate();
    }
    throw e;
  }
}

/**
 * Tên đã có trong `rows` chưa (không phân biệt hoa/thường, mặc định kỹ thuật — tránh hai tên chỉ khác
 * kiểu chữ). So sánh ở ứng dụng vì collation CSDL không xử lý chữ hoa/thường có dấu đáng tin cậy.
 */
export function hasName(rows: { id: string; name: string }[], name: string, exceptId?: string) {
  const key = name.toLocaleLowerCase("vi");
  return rows.some((r) => r.id !== exceptId && r.name.toLocaleLowerCase("vi") === key);
}
