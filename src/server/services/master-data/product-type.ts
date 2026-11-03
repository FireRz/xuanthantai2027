import { prisma } from "@/server/db";
import { duplicateName, hasName, mapUnique, parseName } from "./common";

export async function createProductType(rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.productType.findMany({ select: { id: true, name: true } }), name)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.productType.create({ data: { name } }),
    () => duplicateName(name),
  );
}

export async function renameProductType(id: string, rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.productType.findMany({ select: { id: true, name: true } }), name, id)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.productType.update({ where: { id }, data: { name } }),
    () => duplicateName(name),
  );
}
