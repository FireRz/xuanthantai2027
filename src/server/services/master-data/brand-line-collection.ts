import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { duplicateName, hasName, mapUnique, parseName } from "./common";

async function assertBrandExists(brandId: string | null | undefined): Promise<string> {
  if (!brandId) {
    throw new DomainError("BRAND_REQUIRED", "Vui lòng chọn nhãn hàng");
  }
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (!brand) throw new DomainError("BRAND_NOT_FOUND", "Nhãn hàng không tồn tại");
  return brand.id;
}

// ---- Nhãn hàng ----

export async function createBrand(rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.brand.findMany({ select: { id: true, name: true } }), name)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.brand.create({ data: { name } }),
    () => duplicateName(name),
  );
}

export async function renameBrand(id: string, rawName: string) {
  const name = parseName(rawName);
  if (hasName(await prisma.brand.findMany({ select: { id: true, name: true } }), name, id)) {
    throw duplicateName(name);
  }
  return mapUnique(
    () => prisma.brand.update({ where: { id }, data: { name } }),
    () => duplicateName(name),
  );
}

// ---- Dòng hàng ----

export async function createLine(brandId: string | null | undefined, rawName: string) {
  const name = parseName(rawName);
  const id = await assertBrandExists(brandId);
  const siblings = await prisma.productLine.findMany({
    where: { brandId: id },
    select: { id: true, name: true },
  });
  if (hasName(siblings, name)) throw duplicateName(name);
  return mapUnique(
    () => prisma.productLine.create({ data: { brandId: id, name } }),
    () => duplicateName(name),
  );
}

export async function updateLine(id: string, input: { name?: string; brandId?: string }) {
  const current = await prisma.productLine.findUnique({ where: { id } });
  if (!current) throw new DomainError("LINE_NOT_FOUND", "Dòng hàng không tồn tại");
  const name = input.name === undefined ? current.name : parseName(input.name);
  const brandId = input.brandId ?? current.brandId;

  if (brandId !== current.brandId) {
    await assertBrandExists(brandId);
    const used = await prisma.product.count({ where: { productLineId: id } });
    if (used > 0) {
      throw new DomainError(
        "BRAND_CHANGE_BLOCKED",
        `Không đổi nhãn của dòng đang có ${used} sản phẩm`,
      );
    }
  }
  const siblings = await prisma.productLine.findMany({
    where: { brandId },
    select: { id: true, name: true },
  });
  if (hasName(siblings, name, id)) throw duplicateName(name);
  return mapUnique(
    () => prisma.productLine.update({ where: { id }, data: { name, brandId } }),
    () => duplicateName(name),
  );
}

// ---- Bộ sưu tập ----

export async function createCollection(brandId: string | null | undefined, rawName: string) {
  const name = parseName(rawName);
  const id = await assertBrandExists(brandId);
  const siblings = await prisma.collection.findMany({
    where: { brandId: id },
    select: { id: true, name: true },
  });
  if (hasName(siblings, name)) throw duplicateName(name);
  return mapUnique(
    () => prisma.collection.create({ data: { brandId: id, name } }),
    () => duplicateName(name),
  );
}

export async function updateCollection(id: string, input: { name?: string; brandId?: string }) {
  const current = await prisma.collection.findUnique({ where: { id } });
  if (!current) throw new DomainError("COLLECTION_NOT_FOUND", "Bộ sưu tập không tồn tại");
  const name = input.name === undefined ? current.name : parseName(input.name);
  const brandId = input.brandId ?? current.brandId;

  if (brandId !== current.brandId) {
    await assertBrandExists(brandId);
    const used = await prisma.product.count({ where: { collectionId: id } });
    if (used > 0) {
      throw new DomainError(
        "BRAND_CHANGE_BLOCKED",
        `Không đổi nhãn của bộ sưu tập đang có ${used} sản phẩm`,
      );
    }
  }
  const siblings = await prisma.collection.findMany({
    where: { brandId },
    select: { id: true, name: true },
  });
  if (hasName(siblings, name, id)) throw duplicateName(name);
  return mapUnique(
    () => prisma.collection.update({ where: { id }, data: { name, brandId } }),
    () => duplicateName(name),
  );
}
