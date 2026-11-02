import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { uploadPolicyFor } from "@/server/storage/upload-policy";
import { UnauthorizedError, requireAdmin, unauthorizedResponse } from "@/server/auth/require-admin";

// Cấp token để trình duyệt tải thẳng ảnh / file Excel lên Vercel Blob (ADR-005).
// Chỉ quản trị đăng nhập mới nhận được token (ADR-004 A3) — kiểm tra TRƯỚC khi đọc body.
export const dynamic = "force-dynamic";

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
      onBeforeGenerateToken: async (pathname) => {
        const policy = uploadPolicyFor(pathname);
        if (!policy) throw new Error("Đường dẫn tải lên không được phép");
        return { ...policy, addRandomSuffix: true };
      },
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "UPLOAD_TOKEN_FAILED" }, { status: 400 });
  }
}
