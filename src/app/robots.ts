import type { MetadataRoute } from "next";

/**
 * Máy đọc link để dựng ảnh xem trước khi gửi trong chat (ADR-009 U21). Không phải công cụ tìm kiếm:
 * chỉ đọc đúng link được gửi, và trang vẫn có meta noindex.
 */
const LINK_PREVIEW_BOTS = ["SkypeUriPreview", "Zalo", "facebookexternalhit", "Facebot"];

// Chặn toàn bộ công cụ tìm kiếm (ADR-005 I6, Q-26).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      { userAgent: LINK_PREVIEW_BOTS, allow: "/" },
    ],
  };
}
