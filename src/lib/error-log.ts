// Ghi lỗi máy chủ thành MỘT dòng JSON để tìm trong Vercel Logs (T10.5):
// lọc `"level":"error"` hoặc `"event":"request_error"`. Không ghi dữ liệu người dùng, chỉ đường dẫn + thông điệp.
export type ErrorContext = { path?: string; method?: string; routeType?: string; digest?: string };

export function formatError(err: unknown, ctx: ErrorContext = {}): string {
  const e = err instanceof Error ? err : new Error(String(err));
  return JSON.stringify({
    level: "error",
    event: "request_error",
    time: new Date().toISOString(),
    ...ctx,
    name: e.name,
    message: e.message,
    stack: e.stack?.split("\n").slice(0, 6).join("\n"),
  });
}

export function logError(err: unknown, ctx: ErrorContext = {}): void {
  console.error(formatError(err, ctx));
}
