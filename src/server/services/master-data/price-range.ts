import { prisma } from "@/server/db";
import { duplicateName, hasName, mapUnique, parseName } from "./common";

/** Khung giá mới nằm cuối danh sách (thứ tự theo khoảng giá do chủ dự án định). */
export async function createPriceRange(rawName: string) {
  const name = parseName(rawName);
  const all = await prisma.priceRange.findMany({
    select: { id: true, name: true, sortOrder: true },
  });
  if (hasName(all, name)) throw duplicateName(name);
  const sortOrder = all.reduce((m, r) => Math.max(m, r.sortOrder), 0) + 1;
  return mapUnique(
    () => prisma.priceRange.create({ data: { name, sortOrder } }),
    () => duplicateName(name),
  );
}

export async function renamePriceRange(id: string, rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.priceRange.findMany({ select: { id: true, name: true } }), name, id)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.priceRange.update({ where: { id }, data: { name } }),
    () => duplicateName(name),
  );
}
