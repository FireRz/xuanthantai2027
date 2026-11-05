import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { parseOrThrow, storeCodeSchema } from "@/lib/validation/master-data";
import { mapUnique, parseName } from "./common";

const parseCode = (raw: unknown) => parseOrThrow(storeCodeSchema, raw, "STORE_CODE_INVALID");

const duplicateCode = (code: string) =>
  new DomainError("STORE_CODE_DUPLICATE", `Mã cửa hàng "${code}" đã tồn tại`);

/** Mã cửa hàng duy nhất, so khớp không phân biệt hoa/thường như mã SP (mặc định kỹ thuật). */
async function assertCodeFree(code: string, exceptId?: string) {
  const key = code.toLocaleLowerCase("vi");
  const stores = await prisma.store.findMany({ select: { id: true, code: true } });
  if (stores.some((s) => s.id !== exceptId && s.code.toLocaleLowerCase("vi") === key)) {
    throw duplicateCode(code);
  }
}

/** Khu vực: gõ tự do, gộp khoảng trắng; trống → null (chưa gán). Tối đa 40 ký tự. */
export function parseRegion(raw: string | null | undefined): string | null {
  const v = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!v) return null;
  if (v.length > 40) throw new DomainError("STORE_REGION_INVALID", "Khu vực tối đa 40 ký tự");
  return v;
}

export async function createStore(input: { code: string; name: string; region?: string | null }) {
  const code = parseCode(input.code);
  const name = parseName(input.name);
  const region = parseRegion(input.region);
  await assertCodeFree(code);
  return mapUnique(
    () => prisma.store.create({ data: { code, name, region } }),
    () => duplicateCode(code),
  );
}

export async function updateStore(
  id: string,
  input: { code?: string; name?: string; region?: string | null },
) {
  const current = await prisma.store.findUnique({ where: { id } });
  if (!current) throw new DomainError("STORE_NOT_FOUND", "Cửa hàng không tồn tại");
  const code = input.code === undefined ? current.code : parseCode(input.code);
  const name = input.name === undefined ? current.name : parseName(input.name);
  const region = input.region === undefined ? current.region : parseRegion(input.region);
  await assertCodeFree(code, id);
  return mapUnique(
    () => prisma.store.update({ where: { id }, data: { code, name, region } }),
    () => duplicateCode(code),
  );
}
