import type { MetadataRoute } from "next";
import { site } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Members-only areas and uploaded internal files stay out of search.
        disallow: ["/portal", "/admin", "/login", "/api", "/uploads"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
