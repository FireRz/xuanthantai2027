import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/require-admin";
import { loadFormOptions } from "../form-options";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Thêm sản phẩm" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdminPage();
  const options = await loadFormOptions();
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/products" className="text-sm text-neutral-600 hover:underline">
          ← Danh sách sản phẩm
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Thêm sản phẩm</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Bắt buộc: mã, nhãn hàng, dòng hàng. Ảnh thêm sau khi tạo.
        </p>
      </div>
      {options.brands.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Chưa có nhãn hàng. Hãy tạo nhãn và dòng hàng ở mục{" "}
          <Link href="/admin/master-data" className="underline">
            Danh mục
          </Link>{" "}
          trước.
        </p>
      ) : (
        <ProductForm options={options} />
      )}
    </div>
  );
}
