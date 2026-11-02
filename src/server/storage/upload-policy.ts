/**
 * Chính sách cấp token tải lên Blob theo đường dẫn (ADR-005): chỉ nhận các thư mục đã định,
 * đúng loại file và dung lượng. Không `server-only` để unit test được.
 */

export const PRODUCT_IMAGE_PREFIX = "products/";
export const IMPORT_PREFIX = "imports/";

const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface UploadPolicy {
  allowedContentTypes: string[];
  maximumSizeInBytes: number;
}

/** Trả chính sách cho `pathname`, hoặc null nếu đường dẫn không được phép. */
export function uploadPolicyFor(pathname: string): UploadPolicy | null {
  if (pathname.includes("..") || pathname.startsWith("/")) return null;
  if (pathname.startsWith(PRODUCT_IMAGE_PREFIX) && pathname.length > PRODUCT_IMAGE_PREFIX.length) {
    // Giới hạn 4,5 MB của Vercel; ảnh đã thu nhỏ thường chỉ vài trăm KB.
    return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: 4_500_000 };
  }
  if (pathname.startsWith(IMPORT_PREFIX) && pathname.length > IMPORT_PREFIX.length) {
    return { allowedContentTypes: [XLSX], maximumSizeInBytes: 25 * 1024 * 1024 };
  }
  return null;
}
