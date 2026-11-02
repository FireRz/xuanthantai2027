import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Xuất dữ liệu" };
export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireAdminPage();
  const [products, hidden, pairs] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: false } }),
    prisma.storeProductQty.count({ where: { product: { active: true } } }),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Xuất dữ liệu</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Tải toàn bộ dữ liệu hiện tại theo đúng mẫu nhập Excel (sheet SanPham, SoLuong, HuongDan)
          để sửa rồi nhập lại. File xuất nhập lại ngay sẽ không có lỗi và không tạo thay đổi nào.
        </p>
      </div>

      <div className="grid max-w-xl grid-cols-2 gap-3">
        <div
          className="rounded-lg border border-neutral-200 bg-white p-4"
          data-testid="export-products"
        >
          <b className="block text-2xl tabular-nums">{formatInt(products)}</b>
          <span className="text-sm">SP đang hoạt động</span>
        </div>
        <div
          className="rounded-lg border border-neutral-200 bg-white p-4"
          data-testid="export-pairs"
        >
          <b className="block text-2xl tabular-nums">{formatInt(pairs)}</b>
          <span className="text-sm">Dòng số lượng (SP × cửa hàng)</span>
        </div>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>
          Chỉ gồm sản phẩm đang hoạt động
          {hidden > 0
            ? ` (${formatInt(hidden)} SP đang ẩn không được xuất; nhập lại không ảnh hưởng chúng)`
            : ""}
          .
        </li>
        <li>Gồm mọi cặp (SP, cửa hàng) đã có số liệu, kể cả cửa hàng đang ẩn.</li>
        <li>Với hàng nghìn SP và nhiều cửa hàng, file có thể mất vài chục giây để tạo.</li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <a
          href="/api/admin-export"
          className="inline-flex h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
        >
          Tải file Excel
        </a>
        <Link
          href="/admin/import"
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium"
        >
          Đi tới Nhập Excel
        </Link>
      </div>
    </div>
  );
}
