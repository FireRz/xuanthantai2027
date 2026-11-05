import { logError } from "@/lib/error-log";
import { parseCatalogParams, type RawSearchParams } from "@/lib/catalog-params";
import { getProductDetail } from "@/server/services/product-detail";
import { getProductNeighbors } from "@/server/services/product-neighbors";

// Dữ liệu popup của một SP (chi tiết + SP trước/sau theo danh sách đang xem) để popup chuyển SP
// ngay trên trình duyệt, không phải dựng lại cả trang. Cùng dữ liệu công khai với popup ở trang chủ.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw: RawSearchParams = {};
  for (const [k, v] of new URL(req.url).searchParams) raw[k] = v;
  try {
    const params = parseCatalogParams(raw);
    if (!params.sp) return Response.json({ error: "missing sp" }, { status: 400 });
    const [detail, neighbors] = await Promise.all([
      getProductDetail(params.sp, params.store, params.kv),
      getProductNeighbors(params, params.sp),
    ]);
    if (!detail) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ detail, neighbors }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError(err, { path: "/api/product-view", method: "GET", routeType: "route" });
    return Response.json({ error: "server error" }, { status: 500 });
  }
}
