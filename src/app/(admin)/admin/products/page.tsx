import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { ProductImage } from "@/components/catalog/product-image";
import { formatVnd } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { listAdminProducts, type StatusFilter } from "@/server/services/product-admin";

export const metadata: Metadata = { title: "Sản phẩm" };
export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parseStatus = (v?: string): StatusFilter => (v === "active" || v === "hidden" ? v : "all");

interface Filters {
  q?: string;
  brand?: string;
  status: StatusFilter;
}

function pageHref(f: Filters, page: number) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.brand) sp.set("brand", f.brand);
  if (f.status !== "all") sp.set("status", f.status);
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
  };
  const [brands, list] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    listAdminProducts({
      q: f.q,
      brandId: f.brand,
      status: f.status,
      page: Number(first(raw.page)) || 1,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Sản phẩm</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {list.total} sản phẩm. Sản phẩm không xóa được, chỉ ẩn.
        </p>
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
        <button
          type="submit"
          className="h-10 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
        >
          Lọc
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="p-3">Ảnh</th>
              <th className="p-3">Mã</th>
              <th className="p-3">Tên</th>
              <th className="p-3">Nhãn</th>
              <th className="p-3">Dòng</th>
              <th className="p-3">BST</th>
              <th className="p-3">Chất liệu</th>
              <th className="p-3 text-right">Giá</th>
              <th className="p-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-neutral-500">
                  Không có sản phẩm nào khớp.
                </td>
              </tr>
            )}
            {list.rows.map((r) => (
              <tr key={r.id} data-testid="product-row" className="border-b border-neutral-100">
                <td className="p-2">
                  <ProductImage
                    thumbUrl={r.thumbUrl}
                    alt={r.sku}
                    className="h-12 w-12 rounded text-xs"
                  />
                </td>
                <td className="p-3 font-medium">{r.sku}</td>
                <td className="p-3">{r.name ?? "—"}</td>
                <td className="p-3">{r.brand.name}</td>
                <td className="p-3">{r.productLine.name}</td>
                <td className="p-3">{r.collection?.name ?? "—"}</td>
                <td className="p-3">{r.material?.name ?? "—"}</td>
                <td className="p-3 text-right">
                  {r.priceVnd == null ? "—" : formatVnd(r.priceVnd)}
                </td>
                <td className="p-3">
                  <span
                    className={
                      r.active
                        ? "rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800"
                        : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700"
                    }
                  >
                    {r.active ? "Đang hiện" : "Đã ẩn"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
