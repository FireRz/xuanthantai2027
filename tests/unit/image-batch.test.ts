import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { candidateSkus, planBatch, skuFromFileName, type BatchFile } from "@/lib/image-batch";
import { expandFiles } from "@/lib/image-zip";

const img = (name: string, type = "image/jpeg"): BatchFile => ({
  name,
  blob: new Blob(["x"], { type }),
});
const product = (sku: string, hasImage = false) => ({ id: `id-${sku}`, sku, hasImage });

describe("T07.8 — đối chiếu tên file với mã SP", () => {
  it("tên file bỏ đuôi, không phân biệt hoa/thường", () => {
    expect(skuFromFileName("NTT001.jpg")).toBe("NTT001");
    expect(skuFromFileName("ntt001.PNG")).toBe("NTT001");
    expect(skuFromFileName("NTT.001.webp")).toBe("NTT.001");
  });

  it("10 ảnh, 2 tên sai → 8 khớp, 2 không khớp", () => {
    const products = Array.from({ length: 8 }, (_, i) => product(`NTT00${i + 1}`));
    const files = [
      ...products.map((p) => img(`${p.sku.toLowerCase()}.jpg`)),
      img("SAI001.jpg"),
      img("khong-ro.png", "image/png"),
    ];
    const plan = planBatch(files, products);
    expect(plan.matched).toHaveLength(8);
    expect(plan.unmatched.map((e) => e.file.name)).toEqual(["SAI001.jpg", "khong-ro.png"]);
    expect(plan.duplicates).toHaveLength(0);
  });

  it("hai file cùng mã → cả hai báo trùng mã, không file nào được gắn", () => {
    const plan = planBatch(
      [img("NTT001.jpg"), img("ntt001.png", "image/png")],
      [product("NTT001")],
    );
    expect(plan.matched).toHaveLength(0);
    expect(plan.duplicates).toHaveLength(2);
  });

  it("file không phải ảnh bị từ chối; SP đã có ảnh được đánh dấu thay ảnh", () => {
    const plan = planBatch(
      [img("ghi-chu.pdf", "application/pdf"), img("A1.jpg")],
      [product("A1", true)],
    );
    expect(plan.invalid).toHaveLength(1);
    expect(plan.matched[0]).toMatchObject({ replaces: true });
  });

  it("candidateSkus chỉ lấy file ảnh, bỏ trùng", () => {
    expect(
      candidateSkus([img("a1.jpg"), img("A1.png", "image/png"), img("x.pdf", "application/pdf")]),
    ).toEqual(["A1"]);
  });
});

describe("T07.8 — giải nén .zip", () => {
  it("lấy ảnh trong zip (kể cả thư mục con), bỏ thư mục / file ẩn / __MACOSX", async () => {
    const zip = new JSZip();
    zip.file("anh/NTT001.jpg", "a");
    zip.file("NTT002.png", "b");
    zip.file("__MACOSX/._NTT001.jpg", "junk");
    zip.file(".DS_Store", "junk");
    zip.file("ghi-chu.txt", "c");
    const data = await zip.generateAsync({ type: "uint8array" });
    const file = new File([data as BlobPart], "anh.zip", { type: "application/zip" });

    const { files, errors } = await expandFiles([file, new File(["z"], "NTT003.webp")]);
    expect(errors).toEqual([]);
    expect(files.map((f) => f.name).sort()).toEqual([
      "NTT001.jpg",
      "NTT002.png",
      "NTT003.webp",
      "ghi-chu.txt",
    ]);
    const plan = planBatch(files, [product("NTT001"), product("NTT002"), product("NTT003")]);
    expect(plan.matched).toHaveLength(3);
    expect(plan.invalid.map((e) => e.file.name)).toEqual(["ghi-chu.txt"]);
  });

  it("zip hỏng → báo lỗi, không làm hỏng các file khác", async () => {
    const bad = new File(["không phải zip"], "hong.zip");
    const { files, errors } = await expandFiles([bad, new File(["x"], "A1.jpg")]);
    expect(errors[0]).toContain("hong.zip");
    expect(files.map((f) => f.name)).toEqual(["A1.jpg"]);
  });
});
