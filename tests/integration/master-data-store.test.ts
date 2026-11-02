import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { createStore, updateStore } from "@/server/services/master-data";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("T06.3 — Cửa hàng", () => {
  it("tạo cửa hàng với mã và tên", async () => {
    const s = await createStore({ code: " CH01 ", name: "Quận 1" });
    expect(s).toMatchObject({ code: "CH01", name: "Quận 1", active: true });
  });

  it("thiếu mã hoặc thiếu tên → lỗi", async () => {
    await expect(createStore({ code: "", name: "Quận 1" })).rejects.toMatchObject({
      code: "STORE_CODE_INVALID",
    });
    await expect(createStore({ code: "CH01", name: " " })).rejects.toMatchObject({
      code: "NAME_INVALID",
    });
  });

  it("trùng mã → lỗi (không phân biệt hoa/thường)", async () => {
    await createStore({ code: "CH01", name: "Quận 1" });
    await expect(createStore({ code: "CH01", name: "Khác" })).rejects.toMatchObject({
      code: "STORE_CODE_DUPLICATE",
    });
    await expect(createStore({ code: "ch01", name: "Khác" })).rejects.toMatchObject({
      code: "STORE_CODE_DUPLICATE",
    });
  });

  it("trùng tên nhưng khác mã → được (chỉ mã phải duy nhất)", async () => {
    await createStore({ code: "CH01", name: "Quận 1" });
    await expect(createStore({ code: "CH02", name: "Quận 1" })).resolves.toBeTruthy();
  });

  it("sửa tên; sửa mã trùng cửa hàng khác → lỗi", async () => {
    const a = await createStore({ code: "CH01", name: "Quận 1" });
    await createStore({ code: "CH02", name: "Quận 2" });
    await expect(updateStore(a.id, { name: "Quận Nhất" })).resolves.toMatchObject({
      code: "CH01",
      name: "Quận Nhất",
    });
    await expect(updateStore(a.id, { code: "CH02" })).rejects.toMatchObject({
      code: "STORE_CODE_DUPLICATE",
    });
    await expect(updateStore(a.id, { code: "CH01" })).resolves.toBeTruthy();
  });
});
