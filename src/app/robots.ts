import type { MetadataRoute } from "next";

// Dump is private. Search engines shouldn't list any of it.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
