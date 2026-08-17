import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/client";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Only real, publicly reachable content — never DRAFT/ARCHIVED places, admin, or auth-gated routes. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [places, regions, categories, creators] = await Promise.all([
    prisma.place.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.region.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.creator.findMany({ where: { status: "APPROVED" }, select: { id: true, updatedAt: true } }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${APP_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/discover`, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/map`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const placeEntries: MetadataRoute.Sitemap = places.map((p) => ({
    url: `${APP_URL}/places/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const regionEntries: MetadataRoute.Sitemap = regions.map((r) => ({
    url: `${APP_URL}/regions/${r.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${APP_URL}/categories/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const creatorEntries: MetadataRoute.Sitemap = creators.map((c) => ({
    url: `${APP_URL}/creators/${c.id}`,
    lastModified: c.updatedAt,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticEntries, ...placeEntries, ...regionEntries, ...categoryEntries, ...creatorEntries];
}
