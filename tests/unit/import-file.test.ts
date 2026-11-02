import { describe, expect, it } from "vitest";
import { importPath } from "@/lib/import-upload";
import { isImportBlobUrl } from "@/server/import/import-file";
import { uploadPolicyFor } from "@/server/storage/upload-policy";

describe("T08.6 — file nhập trên Blob", () => {
  it("chỉ chấp nhận URL https trong imports/ của store Blob", () => {
    const ok = "https://abc.public.blob.vercel-storage.com/imports/so-lieu-AbC123.xlsx";
    expect(isImportBlobUrl(ok)).toBe(true);
    expect(isImportBlobUrl(ok.replace("https", "http"))).toBe(false);
    expect(isImportBlobUrl("https://evil.example.com/imports/a.xlsx")).toBe(false);
    expect(isImportBlobUrl("https://abc.public.blob.vercel-storage.com/products/a.xlsx")).toBe(
      false,
    );
    expect(isImportBlobUrl("https://abc.public.blob.vercel-storage.com/imports/../x.xlsx")).toBe(
      false,
    );
    expect(isImportBlobUrl("not a url")).toBe(false);
    expect(isImportBlobUrl("https://blob.vercel-storage.com.evil.com/imports/a.xlsx")).toBe(false);
  });

  it("đường dẫn tải lên: ASCII an toàn và được chính sách chấp nhận (xlsx, ≤ 25 MB)", () => {
    const p = importPath("Số liệu đợt 1 (Xuân).xlsx");
    expect(p).toBe("imports/So-lieu-dot-1-Xuan.xlsx");
    const policy = uploadPolicyFor(p)!;
    expect(policy.maximumSizeInBytes).toBe(25 * 1024 * 1024);
    expect(policy.allowedContentTypes).toEqual([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    expect(importPath("###.xlsx")).toBe("imports/import.xlsx");
  });
});
