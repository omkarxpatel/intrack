import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Only the three public pages are crawlable. The rest is per-user data behind a
 * login: a crawler would be redirected to sign-in anyway, so saying so up front
 * saves it the round trip and keeps those URLs out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/applications", "/insights", "/import", "/account/", "/auth/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
