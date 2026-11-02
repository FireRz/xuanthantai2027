import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { ProductTable } from "./product-table";
import { listAdminProducts, type StatusFilter } from "@/server/services/product-admin";

export const metadata: Metadata = { title: "Sản phẩm" };
export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parseStatus = (v?: string): StatusFilter => (v === "active" || v === "hidden" ? v : "all");

interface Filters {
  q?: string;
  brand?: string;
  status: StatusFilter;
  noImage: boolean;
}

function pageHref(f: Filters, page: number) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.brand) sp.set("brand", f.brand);
  if (f.status !== "all") sp.set("status", f.status);
  if (f.noImage) sp.set("noimage", "1");
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return `/admin/products${s ? `?${s}` : ""}`;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const raw = await searchParams;
  const brandParam = z.uuid().safeParse(first(raw.brand));
  const f: Filters = {
    q: first(raw.q)?.trim() || undefined,
    brand: brandParam.success ? brandParam.data : undefined,
    status: parseStatus(first(raw.status)),
    noImage: first(raw.noimage) === "1",
  };
  const [brands, list] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listAdminProducts({
      q: f.q,
      brandId: f.brand,
      status: f.status,
      noImage: f.noImage,
      page: Number(first(raw.page)) || 1,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sản phẩm</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {list.total} sản phẩm. Sản phẩm không xóa được, chỉ ẩn.
          </p>
        </div>
        <Link
          href="/admin/images"
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium"
        >
          Tải ảnh hàng loạt
        </Link>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center rounded-md bg-[#B3261E] px-4 text-sm font-medium text-white"
        >
          Thêm sản phẩm
        </Link>
      </div>

      <form
        method="get"
        role="search"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-3"
      >
        <label className="text-sm font-medium">
          Tìm theo mã
          <input
            name="q"
            defaultValue={f.q ?? ""}
            placeholder="VD: NTT001"
            className="mt-1 block h-10 w-44 rounded-md border border-neutral-300 px-3 text-sm"
          />
        </label>
        <label className="text-sm font-medium">
          Nhãn hàng
          <select
            name="brand"
            defaultValue={f.brand ?? ""}
            className="mt-1 block h-10 w-44 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="">Tất cả</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Trạng thái
          <select
            name="status"
            defaultValue={f.status}
            className="mt-1 block h-10 w-36 rounded-md border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hiện</option>
            <option value="hidden">Đang ẩn</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="noimage" value="1" defaultChecked={f.noImage} />
          Chỉ SP chưa có ảnh
        </label>
        <button
          type="submit"
          className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
        >
          Lọc
        </button>
      </form>

      <ProductTable
        rows={list.rows.map((r) => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          priceVnd: r.priceVnd,
          thumbUrl: r.thumbUrl,
          active: r.active,
          brand: r.brand.name,
          line: r.productLine.name,
          collection: r.collection?.name ?? null,
          material: r.material?.name ?? null,
        }))}
      />

      {list.pages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center justify-between text-sm">
          {list.page > 1 ? (
            <Link href={pageHref(f, list.page - 1)} className="rounded-md border px-3 py-2">
              ← Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span>
            Trang {list.page}/{list.pages}
          </span>
          {list.page < list.pages ? (
            <Link href={pageHref(f, list.page + 1)} className="rounded-md border px-3 py-2">
              Trang sau →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
