import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { GET } from "@/app/api/health/route";

afterAll(() => prisma.$disconnect());

describe("T10.3 — /api/health", () => {
  it("200 khi kết nối được CSDL", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("503 khi CSDL lỗi", async () => {
    const spy = vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("down"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "error", db: "unreachable" });
    spy.mockRestore();
  });
});
