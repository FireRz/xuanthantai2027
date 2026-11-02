import type { MetadataRoute } from "next";

// Chặn toàn bộ công cụ tìm kiếm (ADR-005 I6, Q-26).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
