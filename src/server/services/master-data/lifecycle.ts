import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import { visibleProductJoinsSql, visibleProductSql } from "@/server/repositories/visibility";

/** Sáu danh mục quản lý ở F06 (kèm Khung giá, ADR-010). */
export type MasterKind = "brand" | "line" | "collection" | "material" | "priceRange" | "store";

type Db = Prisma.TransactionClient | typeof prisma;

const NOT_FOUND = () => new DomainError("NOT_FOUND", "Mục này không tồn tại hoặc đã bị xóa");

type Item = { id: string; active: boolean; name: string };

/** Đọc tên + trạng thái hiện tại; không có → lỗi. */
async function loadItem(db: Db, kind: MasterKind, id: string): Promise<Item> {
  const select = { id: true, active: true, name: true } as const;
  let row: Item | null;
  switch (kind) {
    case "brand":
      row = await db.brand.findUnique({ where: { id }, select });
      break;
    case "line":
      row = await db.productLine.findUnique({ where: { id }, select });
      break;
    case "collection":
      row = await db.collection.findUnique({ where: { id }, select });
      break;
    case "material":
      row = await db.material.findUnique({ where: { id }, select });
      break;
    case "priceRange":
      row = await db.priceRange.findUnique({ where: { id }, select });
      break;
    case "store":
      row = await db.store.findUnique({ where: { id }, select });
      break;
  }
  if (!row) throw NOT_FOUND();
  return row;
}

/**
 * Số SP đang hiển thị trên trang xem mà bị tác động bởi mục này:
 * - nhãn/dòng/BST/chất liệu: SP đang hiện thuộc mục đó (ẩn mục → các SP này ẩn theo);
 * - cửa hàng: SP đang hiện có SL (đặt hoặc về > 0) ở cửa hàng đó (ẩn → số tổng của các SP này đổi).
 */
async function countAffected(db: Db, kind: MasterKind, id: string): Promise<number> {
  const cond =
    kind === "store"
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM store_product_qty q
          WHERE q.product_id = p.id AND q.store_id = ${id}::uuid
            AND (q.qty_ordered > 0 OR q.qty_received > 0))`
      : kind === "brand"
        ? Prisma.sql`p.brand_id = ${id}::uuid`
        : kind === "line"
          ? Prisma.sql`p.product_line_id = ${id}::uuid`
          : kind === "collection"
            ? Prisma.sql`p.collection_id = ${id}::uuid`
            : kind === "priceRange"
              ? Prisma.sql`p.price_range_id = ${id}::uuid`
              : Prisma.sql`p.material_id = ${id}::uuid`;
  const rows = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM product p ${visibleProductJoinsSql}
    WHERE ${visibleProductSql} AND ${cond}`;
  return Number(rows[0]?.n ?? 0);
}

export interface HideImpact {
  kind: MasterKind;
  id: string;
  name: string;
  active: boolean;
  /** Số SP sẽ bị ẩn theo (hoặc, với cửa hàng, số SP có số tổng thay đổi) khi ẩn mục này. */
  affected: number;
}

/** Hiển thị cho quản trị trước khi ẩn (F06: "báo số SP bị ảnh hưởng, yêu cầu xác nhận"). */
export async function getHideImpact(kind: MasterKind, id: string): Promise<HideImpact> {
  const item = await loadItem(prisma, kind, id);
  const affected = item.active ? await countAffected(prisma, kind, id) : 0;
  return { kind, id, name: item.name, active: item.active, affected };
}

export type SetActiveResult =
  | { status: "needs_confirmation"; affected: number }
  | { status: "done"; active: boolean; affected: number };

async function writeActive(db: Db, kind: MasterKind, id: string, active: boolean) {
  const args = { where: { id }, data: { active } };
  switch (kind) {
    case "brand":
      return db.brand.update(args);
    case "line":
      return db.productLine.update(args);
    case "collection":
      return db.collection.update(args);
    case "material":
      return db.material.update(args);
    case "priceRange":
      return db.priceRange.update(args);
    case "store":
      return db.store.update(args);
  }
}

/**
 * Ẩn / hiện một mục. Ẩn luôn cần `confirm: true`; chưa xác nhận thì không ghi gì và trả về
 * số SP bị ảnh hưởng để UI hỏi lại. Hiện lại không cần xác nhận; `affected` là số SP xuất hiện lại.
 * `product.active` không bị đổi (ADR-008 M2) nên SP đã ẩn riêng vẫn ẩn.
 */
export async function setActive(
  kind: MasterKind,
  id: string,
  active: boolean,
  opts: { confirm?: boolean } = {},
): Promise<SetActiveResult> {
  return prisma.$transaction(async (tx) => {
    const item = await loadItem(tx, kind, id);
    if (item.active === active) return { status: "done", active, affected: 0 };

    if (!active) {
      const affected = await countAffected(tx, kind, id);
      if (!opts.confirm) return { status: "needs_confirmation", affected };
      await writeActive(tx, kind, id, false);
      return { status: "done", active: false, affected };
    }

    const before = await countAffected(tx, kind, id);
    await writeActive(tx, kind, id, true);
    const after = await countAffected(tx, kind, id);
    return { status: "done", active: true, affected: after - before };
  });
}

/** Mô tả những gì đang tham chiếu tới mục; rỗng nếu xóa được. */
async function listReferences(kind: MasterKind, id: string): Promise<string[]> {
  const refs: string[] = [];
  const add = (n: number, label: string) => {
    if (n > 0) refs.push(`${n} ${label}`);
  };
  switch (kind) {
    case "brand":
      add(await prisma.productLine.count({ where: { brandId: id } }), "dòng hàng");
      add(await prisma.collection.count({ where: { brandId: id } }), "bộ sưu tập");
      add(await prisma.product.count({ where: { brandId: id } }), "sản phẩm");
      break;
    case "line":
      add(await prisma.product.count({ where: { productLineId: id } }), "sản phẩm");
      break;
    case "collection":
      add(await prisma.product.count({ where: { collectionId: id } }), "sản phẩm");
      break;
    case "material":
      add(await prisma.product.count({ where: { materialId: id } }), "sản phẩm");
      break;
    case "priceRange":
      add(await prisma.product.count({ where: { priceRangeId: id } }), "sản phẩm");
      break;
    case "store":
      add(await prisma.storeProductQty.count({ where: { storeId: id } }), "dòng số lượng");
      break;
  }
  return refs;
}

async function removeRow(kind: MasterKind, id: string) {
  const args = { where: { id } };
  switch (kind) {
    case "brand":
      return prisma.brand.delete(args);
    case "line":
      return prisma.productLine.delete(args);
    case "collection":
      return prisma.collection.delete(args);
    case "material":
      return prisma.material.delete(args);
    case "priceRange":
      return prisma.priceRange.delete(args);
    case "store":
      return prisma.store.delete(args);
  }
}

/** Xóa thật — chỉ khi chưa có gì tham chiếu (ADR-008 M3); nếu có thì phải ẩn. */
export async function deleteMasterItem(kind: MasterKind, id: string): Promise<void> {
  const item = await loadItem(prisma, kind, id);
  const refs = await listReferences(kind, id);
  if (refs.length > 0) {
    throw new DomainError(
      "IN_USE",
      `Không xóa được "${item.name}": đang có ${refs.join(", ")} tham chiếu. Hãy ẩn thay vì xóa.`,
    );
  }
  try {
    await removeRow(kind, id);
  } catch (e) {
    // Có người vừa gắn SP vào mục này giữa lúc kiểm tra và xóa → khóa ngoại Restrict chặn.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      throw new DomainError("IN_USE", `Không xóa được "${item.name}": vừa có dữ liệu tham chiếu.`);
    }
    throw e;
  }
}
