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

export async function createStore(input: { code: string; name: string }) {
  const code = parseCode(input.code);
  const name = parseName(input.name);
  await assertCodeFree(code);
  return mapUnique(
    () => prisma.store.create({ data: { code, name } }),
    () => duplicateCode(code),
  );
}

export async function updateStore(id: string, input: { code?: string; name?: string }) {
  const current = await prisma.store.findUnique({ where: { id } });
  if (!current) throw new DomainError("STORE_NOT_FOUND", "Cửa hàng không tồn tại");
  const code = input.code === undefined ? current.code : parseCode(input.code);
  const name = input.name === undefined ? current.name : parseName(input.name);
  await assertCodeFree(code, id);
  return mapUnique(
    () => prisma.store.update({ where: { id }, data: { code, name } }),
    () => duplicateCode(code),
  );
}
