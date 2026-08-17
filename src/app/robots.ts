import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/trip", "/trip-requests", "/driver", "/saved", "/profile", "/submit", "/creators/apply"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
