import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminPage } from "@/server/auth/require-admin";
import { prisma } from "@/server/db";
import { loadFormOptions } from "../form-options";
import { ImageUploader } from "../image-uploader";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Sửa sản phẩm" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();
  const created = (await searchParams).created === "1";
  const options = await loadFormOptions(product);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/products" className="text-sm text-neutral-600 hover:underline">
          ← Danh sách sản phẩm
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Sản phẩm {product.sku}</h1>
        {created && (
          <p role="status" className="mt-2 text-sm text-green-800">
            Đã thêm sản phẩm.
          </p>
        )}
      </div>
      <ImageUploader productId={product.id} sku={product.sku} thumbUrl={product.thumbUrl} />
      <ProductForm
        options={options}
        initial={{
          id: product.id,
          sku: product.sku,
          name: product.name ?? "",
          brandId: product.brandId,
          productLineId: product.productLineId,
          collectionId: product.collectionId ?? "",
          materialId: product.materialId ?? "",
          productTypeId: product.productTypeId ?? "",
          priceRangeId: product.priceRangeId ?? "",
          priceVnd: product.priceVnd == null ? "" : String(product.priceVnd),
        }}
      />
    </div>
  );
}
