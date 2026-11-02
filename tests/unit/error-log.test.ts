import { describe, expect, it, vi } from "vitest";
import { formatError, logError } from "@/lib/error-log";

describe("error-log", () => {
  it("một dòng JSON, có level/event/path/message", () => {
    const line = formatError(new Error("hỏng"), { path: "/x", method: "GET" });
    expect(line).not.toContain("\n{");
    const o = JSON.parse(line);
    expect(o).toMatchObject({
      level: "error",
      event: "request_error",
      path: "/x",
      message: "hỏng",
    });
  });
  it("nhận giá trị không phải Error", () => {
    expect(JSON.parse(formatError("lạ")).message).toBe("lạ");
  });
  it("logError ghi ra console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(new Error("a"));
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
