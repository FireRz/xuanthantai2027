import { EMPTY, formatInt } from "@/lib/format";
import {
  PRODUCT_COLUMNS,
  QUANTITY_COLUMNS,
  SHEET_PRODUCTS,
  SHEET_QUANTITIES,
  normalizeCode,
  normalizeText,
  type ProductKey,
  type QuantityKey,
} from "@/lib/excel-template";
import { parseCount } from "@/lib/excel-values";
import type {
  FieldChange,
  ImportIssue,
  ImportSheet,
  ImportSummary,
  ProductItem,
  QuantityItem,
} from "@/lib/import-types";
import { skuSchema } from "@/lib/validation/product";
import type { SheetRow, WorkbookData } from "./read-workbook";

/**
 * Kiểm tra & phân loại file nhập theo R3–R15 (T08.7). HÀM THUẦN: nhận dữ liệu file đã đọc và dữ liệu
 * hiện có trên web, trả về lỗi (sheet/dòng/cột/lý do), danh sách thay đổi cũ → mới và kế hoạch ghi.
 * Không chạm CSDL nên xem trước và áp dụng dùng cùng một logic.
 */

// ---- Dữ liệu hiện có trên web ------------------------------------------------------------------

export interface RefNamed {
  id: string;
  name: string;
}
export interface RefClassification extends RefNamed {
  brandId: string;
}
export interface RefStore {
  id: string;
  code: string;
}
export interface RefProduct {
  id: string;
  sku: string;
  name: string | null;
  brandId: string;
  productLineId: string;
  collectionId: string | null;
  materialId: string | null;
  productTypeId: string | null;
  priceRangeId: string | null;
  priceVnd: number | null;
}
export interface RefQuantity {
  productId: string;
  storeId: string;
  ordered: number;
  received: number;
  sold: number;
  stock: number;
}
export interface ReferenceData {
  brands: RefNamed[];
  lines: RefClassification[];
  collections: RefClassification[];
  materials: RefNamed[];
  productTypes: RefNamed[];
  priceRanges: RefNamed[];
  stores: RefStore[];
  products: RefProduct[];
  quantities: RefQuantity[];
}

// ---- Kế hoạch ghi -------------------------------------------------------------------------------

export interface ProductValues {
  name: string | null;
  brandId: string;
  productLineId: string;
  collectionId: string | null;
  materialId: string | null;
  productTypeId: string | null;
  priceRangeId: string | null;
  priceVnd: number | null;
}
export interface NewProductPlan extends ProductValues {
  sku: string;
}
export interface ProductUpdatePlan extends ProductValues {
  id: string;
}
export interface QuantityWritePlan {
  /** SP đã có (id) hoặc SP mới tạo trong cùng lần nhập (mã, so khớp không phân biệt hoa/thường). */
  productId: string | null;
  newSku: string | null;
  storeId: string;
  ordered: number;
  received: number;
  sold: number;
  stock: number;
}
/** Danh mục có trong file nhưng chưa có trên web: sẽ được tạo trước khi ghi SP (id tạm bắt đầu bằng "new:"). */
export interface NewCatalogPlan {
  brands: { tempId: string; name: string }[];
  lines: { tempId: string; brandId: string; name: string }[];
  collections: { tempId: string; brandId: string; name: string }[];
  materials: { tempId: string; name: string }[];
  productTypes: { tempId: string; name: string }[];
  priceRanges: { tempId: string; name: string }[];
}
export const isTempId = (id: string | null): id is string => !!id && id.startsWith("new:");

export interface ImportPlan {
  newCatalog: NewCatalogPlan;
  newProducts: NewProductPlan[];
  productUpdates: ProductUpdatePlan[];
  quantityWrites: QuantityWritePlan[];
}

export interface ImportAnalysis {
  summary: ImportSummary;
  issues: ImportIssue[];
  productItems: ProductItem[];
  quantityItems: QuantityItem[];
  /** Danh mục sẽ được tạo mới, dạng "Tuổi vàng: Bạc" — để hiện ở bản xem trước. */
  newCatalogLabels: string[];
  plan: ImportPlan;
  sheets: { products: boolean; quantities: boolean };
}

// ---- Hằng số / tiện ích -------------------------------------------------------------------------

const MAX_NAME = 200;
const MAX_PRICE = 2_000_000_000; // khớp schema sản phẩm (vừa int32)
const MAX_QTY = 2_000_000_000;

const header = {
  product: Object.fromEntries(PRODUCT_COLUMNS.map((c) => [c.key, c.header])) as Record<
    ProductKey,
    string
  >,
  qty: Object.fromEntries(QUANTITY_COLUMNS.map((c) => [c.key, c.header])) as Record<
    QuantityKey,
    string
  >,
};

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

function byName<T extends RefNamed>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) m.set(normalizeText(it.name), it);
  return m;
}

function byBrandAndName<T extends RefClassification>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) m.set(`${it.brandId}|${normalizeText(it.name)}`, it);
  return m;
}

// ---- Phân tích ----------------------------------------------------------------------------------

export function analyzeImport(file: WorkbookData, ref: ReferenceData): ImportAnalysis {
  const issues: ImportIssue[] = [];
  const issue = (sheet: ImportSheet, row: number, column: string, key: string, reason: string) =>
    issues.push({ sheet, row, column, key, reason });

  const plan: ImportPlan = {
    newCatalog: {
      brands: [],
      lines: [],
      collections: [],
      materials: [],
      productTypes: [],
      priceRanges: [],
    },
    newProducts: [],
    productUpdates: [],
    quantityWrites: [],
  };
  const newCatalogLabels: string[] = [];
  const productItems: ProductItem[] = [];
  const quantityItems: QuantityItem[] = [];
  const summary: ImportSummary = {
    newProducts: 0,
    changedProducts: 0,
    unchangedProducts: 0,
    changedQuantities: 0,
    unchangedQuantities: 0,
    errors: 0,
  };

  if (!file.products && !file.quantities) {
    issue(
      "File",
      0,
      "",
      EMPTY,
      `Không tìm thấy sheet "${SHEET_PRODUCTS}" hoặc "${SHEET_QUANTITIES}". Hãy dùng file mẫu của hệ thống.`,
    );
  }
  for (const [name, sheet] of [
    [SHEET_PRODUCTS, file.products],
    [SHEET_QUANTITIES, file.quantities],
  ] as const) {
    for (const col of sheet?.missingColumns ?? []) {
      issue(name, 1, col, EMPTY, `Thiếu cột "${col}" ở dòng tiêu đề`);
    }
  }

  const brands = byName(ref.brands);
  const brandById = new Map(ref.brands.map((b) => [b.id, b]));
  const lines = byBrandAndName(ref.lines);
  const lineById = new Map(ref.lines.map((l) => [l.id, l]));
  const collections = byBrandAndName(ref.collections);
  const collectionById = new Map(ref.collections.map((c) => [c.id, c]));
  const materials = byName(ref.materials);
  const materialById = new Map(ref.materials.map((m) => [m.id, m]));
  const types = byName(ref.productTypes);
  const typeById = new Map(ref.productTypes.map((t) => [t.id, t]));
  const ranges = byName(ref.priceRanges);
  const rangeById = new Map(ref.priceRanges.map((r) => [r.id, r]));

  // Danh mục chưa có thì tạo ảo (id tạm) để dòng SP tham chiếu; áp dụng sẽ tạo thật trước khi ghi SP.
  const ensureBrand = (raw: string): RefNamed => {
    const key = normalizeText(raw);
    let b = brands.get(key);
    if (!b) {
      const name = collapse(raw);
      b = { id: `new:brand:${key}`, name };
      brands.set(key, b);
      brandById.set(b.id, b);
      plan.newCatalog.brands.push({ tempId: b.id, name });
      newCatalogLabels.push(`Nhãn hàng: ${name}`);
    }
    return b;
  };
  const ensureClassified = (
    kind: "line" | "collection",
    brand: RefNamed,
    raw: string,
  ): RefClassification => {
    const map = kind === "line" ? lines : collections;
    const byId = kind === "line" ? lineById : collectionById;
    const key = `${brand.id}|${normalizeText(raw)}`;
    let it = map.get(key);
    if (!it) {
      const name = collapse(raw);
      it = { id: `new:${kind}:${key}`, brandId: brand.id, name };
      map.set(key, it);
      byId.set(it.id, it);
      (kind === "line" ? plan.newCatalog.lines : plan.newCatalog.collections).push({
        tempId: it.id,
        brandId: brand.id,
        name,
      });
      newCatalogLabels.push(
        `${kind === "line" ? "Dòng hàng" : "Bộ sưu tập"}: ${name} (${brand.name})`,
      );
    }
    return it;
  };
  const SIMPLE = {
    material: {
      map: materials,
      byId: materialById,
      list: plan.newCatalog.materials,
      label: "Tuổi vàng",
    },
    productType: {
      map: types,
      byId: typeById,
      list: plan.newCatalog.productTypes,
      label: "Chủng loại",
    },
    priceRange: {
      map: ranges,
      byId: rangeById,
      list: plan.newCatalog.priceRanges,
      label: "Khung giá",
    },
  };
  const ensureSimple = (kind: keyof typeof SIMPLE, raw: string): RefNamed => {
    const { map, byId, list, label } = SIMPLE[kind];
    const key = normalizeText(raw);
    let it = map.get(key);
    if (!it) {
      const name = collapse(raw);
      it = { id: `new:${kind}:${key}`, name };
      map.set(key, it);
      byId.set(it.id, it);
      list.push({ tempId: it.id, name });
      newCatalogLabels.push(`${label}: ${name}`);
    }
    return it;
  };
  const storeByCode = new Map(ref.stores.map((s) => [normalizeCode(s.code), s]));
  const productBySku = new Map(ref.products.map((p) => [normalizeCode(p.sku), p]));
  const qtyByPair = new Map(ref.quantities.map((q) => [`${q.productId}|${q.storeId}`, q]));

  /** Mã SP có trong sheet SanPham của file (kể cả dòng lỗi) — dùng cho R11. */
  const fileSkus = new Set<string>();

  // ---- Sheet SanPham ----
  const productsOk = (file.products?.missingColumns.length ?? 0) === 0;
  if (file.products && productsOk) {
    const seen = new Map<string, number>();

    const analyzeProductRow = (r: SheetRow<ProductKey>) => {
      const c = r.cells;
      const sheet = SHEET_PRODUCTS;
      const rawSku = c.sku;
      if (rawSku === undefined) {
        issue(sheet, r.row, header.product.sku, EMPTY, "Thiếu Mã SP");
        return;
      }
      const skuParsed = skuSchema.safeParse(rawSku);
      if (!skuParsed.success) {
        issue(sheet, r.row, header.product.sku, rawSku, skuParsed.error.issues[0].message);
        return;
      }
      const sku = skuParsed.data;
      const norm = normalizeCode(sku);
      fileSkus.add(norm);
      const first = seen.get(norm);
      if (first !== undefined) {
        issue(sheet, r.row, header.product.sku, sku, `Mã SP trùng với dòng ${first} của sheet này`);
        return;
      }
      seen.set(norm, r.row);

      const existing = productBySku.get(norm);
      let ok = true;
      const fail = (key: ProductKey, reason: string) => {
        issue(sheet, r.row, header.product[key], existing?.sku ?? sku, reason);
        ok = false;
      };

      // Tên
      let name: string | null | undefined;
      if (c.name !== undefined) {
        name = collapse(c.name);
        if (name.length > MAX_NAME) {
          fail("name", `Tên tối đa ${MAX_NAME} ký tự`);
          name = undefined;
        }
      }

      // Nhãn
      let brandId: string | undefined;
      if (c.brand !== undefined) {
        brandId = ensureBrand(c.brand).id;
      }
      const effectiveBrandId = brandId ?? existing?.brandId;
      const effectiveBrandName = effectiveBrandId
        ? (brandById.get(effectiveBrandId)?.name ?? "")
        : "";
      const brandChanged = !!existing && brandId !== undefined && brandId !== existing.brandId;

      // Dòng
      let lineId: string | undefined;
      if (c.line !== undefined && (brandId !== undefined || c.brand === undefined)) {
        // Chưa biết nhãn (SP mới thiếu nhãn): lỗi thiếu nhãn được báo ở dưới.
        if (effectiveBrandId) {
          lineId = ensureClassified("line", brandById.get(effectiveBrandId)!, c.line).id;
        }
      }

      // Bộ sưu tập
      let collectionId: string | undefined;
      if (c.collection !== undefined && (brandId !== undefined || c.brand === undefined)) {
        if (effectiveBrandId) {
          collectionId = ensureClassified(
            "collection",
            brandById.get(effectiveBrandId)!,
            c.collection,
          ).id;
        }
      }

      // Tuổi vàng, Chủng loại, Khung giá
      let materialId: string | undefined;
      if (c.material !== undefined) {
        materialId = ensureSimple("material", c.material).id;
      }
      let productTypeId: string | undefined;
      if (c.productType !== undefined) {
        productTypeId = ensureSimple("productType", c.productType).id;
      }
      let priceRangeId: string | undefined;
      if (c.priceRange !== undefined) {
        priceRangeId = ensureSimple("priceRange", c.priceRange).id;
      }

      // Giá
      let price: number | undefined;
      if (c.price !== undefined) {
        const n = parseCount(c.price);
        if (n === null || n > MAX_PRICE) fail("price", "Giá bán lẻ phải là số nguyên VND ≥ 0");
        else price = n;
      }

      // Bắt buộc khi tạo mới (P4) / nhất quán nhãn khi đổi nhãn (R9, R13)
      if (!existing) {
        if (c.brand === undefined) fail("brand", "Bắt buộc khi tạo SP mới");
        if (c.line === undefined) fail("line", "Bắt buộc khi tạo SP mới");
      } else if (brandChanged) {
        if (c.line === undefined) {
          fail(
            "line",
            `Đổi nhãn sang ${effectiveBrandName} thì phải điền Dòng hàng thuộc nhãn đó (dòng hiện có thuộc nhãn cũ)`,
          );
        }
        if (c.collection === undefined && existing.collectionId) {
          fail(
            "collection",
            `Đổi nhãn sang ${effectiveBrandName} thì phải điền Bộ sưu tập thuộc nhãn đó (BST hiện có thuộc nhãn cũ)`,
          );
        }
      }
      if (!ok) return;

      // Giá trị sau khi áp dụng (ô trống = giữ nguyên — R6)
      const next: ProductValues = existing
        ? {
            name: name ?? existing.name,
            brandId: brandId ?? existing.brandId,
            productLineId: lineId ?? existing.productLineId,
            collectionId: collectionId ?? existing.collectionId,
            materialId: materialId ?? existing.materialId,
            productTypeId: productTypeId ?? existing.productTypeId,
            priceRangeId: priceRangeId ?? existing.priceRangeId,
            priceVnd: price ?? existing.priceVnd,
          }
        : {
            name: name ?? null,
            brandId: brandId!,
            productLineId: lineId!,
            collectionId: collectionId ?? null,
            materialId: materialId ?? null,
            productTypeId: productTypeId ?? null,
            priceRangeId: priceRangeId ?? null,
            priceVnd: price ?? null,
          };

      const display = {
        name: (v: string | null) => v ?? EMPTY,
        brand: (id: string | null) => (id ? (brandById.get(id)?.name ?? EMPTY) : EMPTY),
        line: (id: string | null) => (id ? (lineById.get(id)?.name ?? EMPTY) : EMPTY),
        collection: (id: string | null) => (id ? (collectionById.get(id)?.name ?? EMPTY) : EMPTY),
        material: (id: string | null) => (id ? (materialById.get(id)?.name ?? EMPTY) : EMPTY),
        type: (id: string | null) => (id ? (typeById.get(id)?.name ?? EMPTY) : EMPTY),
        range: (id: string | null) => (id ? (rangeById.get(id)?.name ?? EMPTY) : EMPTY),
        price: (v: number | null) => (v === null ? EMPTY : formatInt(v)),
      };
      const changes: FieldChange[] = [];
      const add = (key: ProductKey, o: string, n: string, same: boolean) => {
        if (!same) changes.push({ column: header.product[key], old: o, new: n });
      };
      const old: ProductValues | null = existing ?? null;
      add(
        "name",
        display.name(old?.name ?? null),
        display.name(next.name),
        old?.name === next.name || (!old && next.name === null),
      );
      add(
        "brand",
        display.brand(old?.brandId ?? null),
        display.brand(next.brandId),
        old?.brandId === next.brandId,
      );
      add(
        "line",
        display.line(old?.productLineId ?? null),
        display.line(next.productLineId),
        old?.productLineId === next.productLineId,
      );
      add(
        "collection",
        display.collection(old?.collectionId ?? null),
        display.collection(next.collectionId),
        (old?.collectionId ?? null) === next.collectionId,
      );
      add(
        "material",
        display.material(old?.materialId ?? null),
        display.material(next.materialId),
        (old?.materialId ?? null) === next.materialId,
      );
      add(
        "productType",
        display.type(old?.productTypeId ?? null),
        display.type(next.productTypeId),
        (old?.productTypeId ?? null) === next.productTypeId,
      );
      add(
        "priceRange",
        display.range(old?.priceRangeId ?? null),
        display.range(next.priceRangeId),
        (old?.priceRangeId ?? null) === next.priceRangeId,
      );
      add(
        "price",
        display.price(old?.priceVnd ?? null),
        display.price(next.priceVnd),
        (old?.priceVnd ?? null) === next.priceVnd,
      );

      if (!existing) {
        summary.newProducts++;
        productItems.push({ row: r.row, sku, kind: "new", changes });
        plan.newProducts.push({ sku, ...next });
      } else if (changes.length > 0) {
        summary.changedProducts++;
        productItems.push({ row: r.row, sku: existing.sku, kind: "changed", changes });
        plan.productUpdates.push({ id: existing.id, ...next });
      } else {
        summary.unchangedProducts++;
      }
    };
    for (const r of file.products.rows) analyzeProductRow(r);
  } else if (file.products) {
    for (const r of file.products.rows) {
      if (r.cells.sku) fileSkus.add(normalizeCode(r.cells.sku));
    }
  }

  // ---- Sheet SoLuong ----
  if (file.quantities && file.quantities.missingColumns.length === 0) {
    const seen = new Map<string, number>();
    const sheet = SHEET_QUANTITIES;
    for (const r of file.quantities.rows) {
      const c = r.cells;
      const key = `${c.sku ?? EMPTY} / ${c.store ?? EMPTY}`;
      let ok = true;
      const fail = (k: QuantityKey, reason: string) => {
        issue(sheet, r.row, header.qty[k], key, reason);
        ok = false;
      };

      if (c.sku === undefined) fail("sku", "Thiếu Mã SP");
      if (c.store === undefined) fail("store", "Thiếu Mã cửa hàng");

      const normSku = c.sku === undefined ? undefined : normalizeCode(c.sku);
      const existing = normSku === undefined ? undefined : productBySku.get(normSku);
      if (normSku !== undefined && !existing && !fileSkus.has(normSku)) {
        fail("sku", `Mã SP "${c.sku}" không có trong sheet SanPham của file và chưa có trên web`);
      }
      const store = c.store === undefined ? undefined : storeByCode.get(normalizeCode(c.store));
      if (c.store !== undefined && !store) {
        fail("store", `Mã cửa hàng "${c.store}" chưa có trên web`);
      }

      const parseQty = (k: "ordered" | "received" | "sold" | "stock"): number | undefined => {
        const raw = c[k];
        if (raw === undefined) return undefined;
        const n = parseCount(raw);
        if (n === null || n > MAX_QTY) {
          fail(k, "Số lượng phải là số nguyên ≥ 0");
          return undefined;
        }
        return n;
      };
      const ordered = parseQty("ordered");
      const received = parseQty("received");
      const sold = parseQty("sold");
      const stock = parseQty("stock");

      if (normSku !== undefined && c.store !== undefined) {
        const pair = `${normSku}|${normalizeCode(c.store)}`;
        const first = seen.get(pair);
        if (first !== undefined) {
          fail("sku", `Cặp (Mã SP, Mã cửa hàng) trùng với dòng ${first} của sheet này`);
        } else seen.set(pair, r.row);
      }
      if (!ok || !store || normSku === undefined) continue;

      const prev = existing ? qtyByPair.get(`${existing.id}|${store.id}`) : undefined;
      const oldQ = {
        ordered: prev?.ordered ?? 0,
        received: prev?.received ?? 0,
        sold: prev?.sold ?? 0,
        stock: prev?.stock ?? 0,
      };
      const newQ = {
        ordered: ordered ?? oldQ.ordered,
        received: received ?? oldQ.received,
        sold: sold ?? oldQ.sold,
        stock: stock ?? oldQ.stock,
      };
      if (
        newQ.ordered === oldQ.ordered &&
        newQ.received === oldQ.received &&
        newQ.sold === oldQ.sold &&
        newQ.stock === oldQ.stock
      ) {
        summary.unchangedQuantities++;
        continue;
      }
      summary.changedQuantities++;
      quantityItems.push({
        row: r.row,
        sku: existing?.sku ?? c.sku!,
        store: c.store!,
        old: oldQ,
        new: newQ,
      });
      plan.quantityWrites.push({
        productId: existing?.id ?? null,
        newSku: existing ? null : normSku,
        storeId: store.id,
        ...newQ,
      });
    }
  }

  summary.errors = issues.length;
  return {
    summary,
    issues,
    productItems,
    quantityItems,
    newCatalogLabels,
    plan,
    sheets: { products: !!file.products, quantities: !!file.quantities },
  };
}
