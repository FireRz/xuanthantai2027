import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/server/auth/require-admin";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Nhập Excel" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdminPage();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Nhập Excel</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Cập nhật sản phẩm và số lượng đặt / đã về theo từng cửa hàng bằng file Excel. Luôn có
            bước xem trước; chỉ khi hết lỗi mới áp dụng được, và áp dụng là “tất cả hoặc không”.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/import-template"
            className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium"
          >
            Tải file mẫu
          </a>
          <Link
            href="/admin/export"
            className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium"
          >
            Xuất dữ liệu hiện tại
          </Link>
        </div>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
        <li>Giá trị trong file ghi đè giá trị hiện có; ô để trống thì giữ nguyên.</li>
        <li>
          Cửa hàng, Nhãn, Dòng, Bộ sưu tập, Chất liệu, Khung giá phải có sẵn trên web (tạo ở mục
          Danh mục trước); SP mới thì được tạo từ file.
        </li>
        <li>Chi tiết từng cột nằm ở sheet HuongDan trong file mẫu.</li>
      </ul>
      <ImportFlow />
    </div>
  );
}
