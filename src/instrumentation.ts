import type { Instrumentation } from "next";
import { logError } from "@/lib/error-log";

// Mọi lỗi không bắt được khi render/route handler/server action đều qua đây → Vercel Logs.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  logError(err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    digest: (err as { digest?: string }).digest,
  });
};
