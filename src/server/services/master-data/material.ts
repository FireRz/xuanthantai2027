import { prisma } from "@/server/db";
import { duplicateName, hasName, mapUnique, parseName } from "./common";

export async function createMaterial(rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.material.findMany({ select: { id: true, name: true } }), name)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.material.create({ data: { name } }),
    () => duplicateName(name),
  );
}

export async function renameMaterial(id: string, rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.material.findMany({ select: { id: true, name: true } }), name, id)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.material.update({ where: { id }, data: { name } }),
    () => duplicateName(name),
  );
}
