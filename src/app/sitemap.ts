import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { site } from "@/lib/config";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/publications`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/news`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/events`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/gallery`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/achievements`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.7 },
  ];

  try {
    const [publications, posts, albums, events] = await Promise.all([
      db.publication.findMany({
        where: { isPublic: true },
        select: { slug: true, updatedAt: true },
      }),
      db.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
      }),
      db.album.findMany({
        where: { isPublic: true },
        select: { slug: true, updatedAt: true },
      }),
      db.event.findMany({
        where: { isPublic: true },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...publications.map((p) => ({
        url: `${base}/publications/${p.slug}`,
        lastModified: p.updatedAt,
        priority: 0.8,
      })),
      ...posts.map((p) => ({
        url: `${base}/news/${p.slug}`,
        lastModified: p.updatedAt,
        priority: 0.7,
      })),
      ...albums.map((a) => ({
        url: `${base}/gallery/${a.slug}`,
        lastModified: a.updatedAt,
        priority: 0.5,
      })),
      ...events.map((e) => ({
        url: `${base}/events/${e.id}`,
        lastModified: e.updatedAt,
        priority: 0.5,
      })),
    ];
  } catch {
    // A database hiccup shouldn't return a broken sitemap — serve the static
    // routes and let the next revalidation pick up the rest.
    return staticRoutes;
  }
}
