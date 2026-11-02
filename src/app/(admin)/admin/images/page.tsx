import type { Metadata } from "next";
import Link from "next/link";
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
      <section
        aria-label="Hướng dẫn đặt tên ảnh"
        className="rounded-lg border border-neutral-200 bg-white p-4 text-sm"
      >
        <h2 className="font-semibold">Cách đặt tên ảnh</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
          <li>
            Tên file = mã sản phẩm, đuôi <code>.jpg</code>, <code>.png</code> hoặc{" "}
            <code>.webp</code>. Ví dụ sản phẩm <code>NTT001</code> → <code>NTT001.jpg</code>.
          </li>
          <li>
            Không phân biệt chữ hoa/thường (<code>ntt001.JPG</code> vẫn khớp).
          </li>
          <li>
            Mỗi sản phẩm chỉ 1 ảnh. Hai file cùng mã sẽ bị báo &quot;trùng mã&quot; và không file
            nào được gắn.
          </li>
          <li>
            Nén nhiều ảnh thành một file .zip để tải một lần; thư mục con trong .zip được chấp nhận.
          </li>
          <li>
            Ảnh được thu nhỏ ngay trên máy bạn (khoảng 1600 px) trước khi tải, nên ảnh gốc lớn vẫn
            tải nhanh.
          </li>
          <li>
            Xem sản phẩm nào còn thiếu ảnh:{" "}
            <Link href="/admin/products?noimage=1" className="underline">
              lọc &quot;SP chưa có ảnh&quot;
            </Link>
            .
          </li>
        </ul>
      </section>
      <ImageBatch />
    </div>
  );
}
