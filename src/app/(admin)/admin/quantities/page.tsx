import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { quantitiesForProduct, quantitiesForStore } from "@/server/services/quantity-admin";
import { QuantityEditor } from "./quantity-editor";

export const metadata: Metadata = { title: "Số lượng" };
export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const inputCls = "mt-1 block h-10 rounded-md border border-neutral-300 px-3 text-sm";
const submitCls = "h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white";

export default async function QuantitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const raw = await searchParams;
  const sku = first(raw.sp)?.trim() || undefined;
  const storeCode = first(raw.store)?.trim() || undefined;
  const q = first(raw.q)?.trim() || undefined;
  const mode = sku !== undefined || first(raw.mode) === "sp" ? "sp" : "store";
  const stores = await prisma.store.findMany({ orderBy: { code: "asc" } });

  const byProduct = mode === "sp" && sku ? await quantitiesForProduct(sku) : null;
  const byStore =
    mode === "store" && storeCode
      ? await quantitiesForStore(storeCode, { q, page: Number(first(raw.page)) || 1 })
      : null;

  const tab = (href: string, on: boolean, text: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium ${on ? "bg-neutral-900 text-white" : "border bg-white"}`}
    >
      {text}
    </Link>
  );
  const pageHref = (p: number) =>
    `/admin/quantities?store=${encodeURIComponent(storeCode ?? "")}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Số lượng</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sửa nhanh SL đặt / SL đã về. Số nhập vào ghi đè số cũ. Sửa nhiều số cùng lúc thì dùng{" "}
          <Link href="/admin/import" className="underline">
            Nhập Excel
          </Link>
          .
        </p>
      </div>
      <div className="flex gap-2">
        {tab("/admin/quantities?mode=sp", mode === "sp", "Theo sản phẩm")}
        {tab("/admin/quantities", mode === "store", "Theo cửa hàng")}
      </div>

      {mode === "sp" ? (
        <>
          <form method="get" role="search" className="flex items-end gap-3">
            <input type="hidden" name="mode" value="sp" />
            <label className="text-sm font-medium">
              Mã sản phẩm
              <input
                name="sp"
                defaultValue={sku ?? ""}
                placeholder="VD: NTT001"
                className={`${inputCls} w-48`}
              />
            </label>
            <button type="submit" className={submitCls}>
              Mở
            </button>
          </form>
          {sku && !byProduct && (
            <p role="alert" className="text-sm text-red-700">
              Không có sản phẩm mã “{sku}”.
            </p>
          )}
          {byProduct && (
            <>
              <h2 className="font-medium">
                {byProduct.product.sku}
                {byProduct.product.name ? ` — ${byProduct.product.name}` : ""}
              </h2>
              {byProduct.rows.length === 0 ? (
                <p className="text-sm text-neutral-600">
                  Chưa có cửa hàng nào. Tạo ở mục Danh mục.
                </p>
              ) : (
                <QuantityEditor
                  rowHeader="Cửa hàng"
                  rows={byProduct.rows.map((r) => ({
                    key: r.storeId,
                    productId: byProduct.product.id,
                    storeId: r.storeId,
                    label: r.code,
                    sub: r.active ? r.name : `${r.name} (đang ẩn)`,
                    muted: !r.active,
                    ordered: r.ordered,
                    received: r.received,
                  }))}
                />
              )}
            </>
          )}
        </>
      ) : (
        <>
          <form method="get" role="search" className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              Cửa hàng
              <select
                name="store"
                defaultValue={storeCode ?? ""}
                className={`${inputCls} w-64 bg-white px-2`}
              >
                <option value="">— Chọn cửa hàng —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} — {s.name}
                    {s.active ? "" : " (ẩn)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Lọc theo mã SP
              <input name="q" defaultValue={q ?? ""} className={`${inputCls} w-44`} />
            </label>
            <button type="submit" className={submitCls}>
              Mở
            </button>
          </form>
          {storeCode && !byStore && (
            <p role="alert" className="text-sm text-red-700">
              Không có cửa hàng mã “{storeCode}”.
            </p>
          )}
          {byStore && (
            <>
              <h2 className="font-medium">
                {byStore.store.code} — {byStore.store.name} · {byStore.total} sản phẩm
              </h2>
              <QuantityEditor
                rowHeader="Sản phẩm"
                rows={byStore.rows.map((r) => ({
                  key: r.productId,
                  productId: r.productId,
                  storeId: byStore.store.id,
                  label: r.sku,
                  sub: r.active ? (r.name ?? undefined) : `${r.name ?? ""} (đang ẩn)`,
                  muted: !r.active,
                  ordered: r.ordered,
                  received: r.received,
                }))}
              />
              {byStore.pages > 1 && (
                <nav aria-label="Phân trang" className="flex items-center justify-between text-sm">
                  {byStore.page > 1 ? (
                    <Link href={pageHref(byStore.page - 1)} className="rounded-md border px-3 py-2">
                      ← Trang trước
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span>
                    Trang {byStore.page}/{byStore.pages}
                  </span>
                  {byStore.page < byStore.pages ? (
                    <Link href={pageHref(byStore.page + 1)} className="rounded-md border px-3 py-2">
                      Trang sau →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
