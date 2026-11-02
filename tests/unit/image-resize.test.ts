import { describe, expect, it } from "vitest";
import { fitWithin, isAcceptedImage } from "@/lib/image-resize";
import { uploadPolicyFor } from "@/server/storage/upload-policy";

describe("T07.3 — thu nhỏ ảnh (phần tính toán)", () => {
  it("giữ tỷ lệ, cạnh dài nhất ≤ giới hạn", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 400)).toEqual({ width: 300, height: 400 });
  });
  it("không phóng to ảnh nhỏ", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
  it("ảnh rất dẹt không về 0 px", () => {
    expect(fitWithin(10000, 2, 1600).height).toBeGreaterThanOrEqual(1);
  });
  it("chỉ nhận JPG/PNG/WEBP", () => {
    expect(isAcceptedImage({ name: "a.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedImage({ name: "a.PNG", type: "" })).toBe(true);
    expect(isAcceptedImage({ name: "a.gif", type: "image/gif" })).toBe(false);
    expect(isAcceptedImage({ name: "a.pdf", type: "application/pdf" })).toBe(false);
  });
});

describe("T07.3 — chính sách token tải lên", () => {
  it("ảnh SP: đúng loại và ≤ 4,5 MB", () => {
    const p = uploadPolicyFor("products/NTT001/image.webp");
    expect(p?.maximumSizeInBytes).toBe(4_500_000);
    expect(p?.allowedContentTypes).toContain("image/webp");
    expect(p?.allowedContentTypes).not.toContain("application/pdf");
  });
  it("đường dẫn lạ / thoát thư mục bị từ chối", () => {
    expect(uploadPolicyFor("evil/x.webp")).toBeNull();
    expect(uploadPolicyFor("products/../x.webp")).toBeNull();
    expect(uploadPolicyFor("/products/x.webp")).toBeNull();
    expect(uploadPolicyFor("products/")).toBeNull();
  });
});
