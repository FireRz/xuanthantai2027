import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { UnauthorizedError, requireAdmin, unauthorizedResponse } from "@/server/auth/require-admin";

// Cấp token để trình duyệt tải thẳng ảnh / file Excel lên Vercel Blob (ADR-005).
// Chỉ quản trị đăng nhập mới nhận được token (ADR-004 A3) — kiểm tra TRƯỚC khi đọc body.
export const dynamic = "force-dynamic";

// Giới hạn kích thước từng loại sẽ siết lại ở T07.3 (ảnh) và T08.6 (Excel).
const ALLOWED_CONTENT_TYPES = [
  "image/webp",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SIZE_BYTES,
        addRandomSuffix: true,
      }),
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "UPLOAD_TOKEN_FAILED" }, { status: 400 });
  }
}
