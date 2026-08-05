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
        take: 3,
      },
      _count: { select: { media: { where: { isPublic: true } } } },
    },
  });

  // An album with no public photos would be an empty page — don't link to it.
  const visible = albums.filter((a) => a._count.media > 0);
  const [lead, ...rest] = visible;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="label label-accent">Photographs</p>
        <h1 className="mt-2.5 font-serif text-[32px] leading-tight tracking-[-0.02em] sm:text-[42px]">
          Gallery
        </h1>
        <p className="standfirst measure-wide mt-4">
          Events, launches, and the working life of the Board — shot by our own
          photographers.
        </p>
      </header>

      {visible.length > 0 ? (
        <>
          {/*
            The lead album runs the full width at its natural proportions. On a
            page whose whole subject is photography, the design's job is to get
            out of the way — so no card, no border, no shadow. The picture is
            the interface.
          */}
          <Link href={`/gallery/${lead.slug}`} className="group block">
            <div className="overflow-hidden bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lead.media[0].url}
                alt=""
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[21/9]"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink pb-4">
              <h2 className="font-serif text-[24px] leading-tight group-hover:text-brand sm:text-[30px]">
                {lead.title}
              </h2>
              <p className="label">
                {lead._count.media} photographs
                {lead.eventDate ? ` · ${formatDate(lead.eventDate)}` : ""}
              </p>
            </div>
            {lead.description ? (
              <p className="measure-wide mt-3 text-[14.5px] leading-relaxed text-ink-2">
                {lead.description}
              </p>
            ) : null}
          </Link>

          {rest.length > 0 ? (
            <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((album) => (
                <li key={album.id}>
                  <Link href={`/gallery/${album.slug}`} className="group block">
                    <div className="overflow-hidden bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={album.media[0].url}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>

                    {/*
                      Two more frames from inside the album, small. It shows
                      what is actually in there — a single cover tells you an
                      album exists, not whether it is worth opening.
                    */}
                    {album.media.length > 1 ? (
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        {album.media.slice(1, 3).map((m) => (
                          <div key={m.id} className="overflow-hidden bg-surface-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.url}
                              alt=""
                              loading="lazy"
                              className="aspect-[3/2] w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <h2 className="mt-3 font-serif text-[19px] leading-snug group-hover:text-brand">
                      {album.title}
                    </h2>
                    <p className="label mt-1.5">
                      {album._count.media} photographs
                      {album.eventDate ? ` · ${formatDate(album.eventDate)}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </>
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
