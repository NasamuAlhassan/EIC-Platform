import type { Metadata } from "next";
import Link from "next/link";
import { Images } from "lucide-react";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Gallery",
  description: `Photographs from events, launches, and the working life of the ${site.boardName}.`,
};

export default async function GalleryPage() {
  const albums = await db.album.findMany({
    where: { isPublic: true },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    include: {
      media: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      _count: { select: { media: { where: { isPublic: true } } } },
    },
  });

  // An album with no public photos would be an empty page — don't link to it.
  const visible = albums.filter((a) => a._count.media > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-9">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          Photographs
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          Gallery
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Events, launches, and the working life of the Board — shot by our own
          photographers.
        </p>
      </header>

      {visible.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((album) => (
            <li key={album.id}>
              <Link
                href={`/gallery/${album.slug}`}
                className="group block overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card transition-shadow hover:shadow-pop"
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                  {album.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.media[0].url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h2 className="font-serif text-[18px] leading-snug group-hover:text-brand">
                    {album.title}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-ink-3">
                    {album._count.media}{" "}
                    {album._count.media === 1 ? "photo" : "photos"}
                    {album.eventDate ? ` · ${formatDate(album.eventDate)}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Images size={20} />}
          title="No public albums yet"
          description="Once the media team publishes an album, it will show up here."
        />
      )}
    </div>
  );
}
