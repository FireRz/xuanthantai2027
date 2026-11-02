// Diễn tập giám sát (T10.5): gây lỗi 500 có chủ đích để kiểm tra Vercel Logs / cảnh báo.
// Chỉ hoạt động khi đặt ERROR_DRILL=1 (bật tạm trên Preview, tắt sau khi thử); mặc định trả 404.
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.ERROR_DRILL !== "1") return new Response("Not found", { status: 404 });
  throw new Error("Lỗi giả để diễn tập giám sát (ERROR_DRILL)");
}
