import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth/require-admin";
import { ImageBatch } from "./image-batch";

export const metadata: Metadata = { title: "Ảnh" };
export const dynamic = "force-dynamic";

export default async function AdminImagesPage() {
  await requireAdminPage();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Tải ảnh hàng loạt</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Đặt tên file ảnh theo mã sản phẩm (VD <code>NTT001.jpg</code>). Mỗi sản phẩm 1 ảnh; tải
          lại cùng mã sẽ thay ảnh cũ. Chọn nhiều ảnh, một thư mục hoặc một file .zip.
        </p>
      </div>
      <ImageBatch />
    </div>
  );
}
