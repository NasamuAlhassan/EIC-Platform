import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { formatFullDate } from "@/lib/utils";
import { PhotoGrid } from "@/components/lightbox";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const album = await db.album.findUnique({ where: { slug } });
  if (!album || !album.isPublic) return { title: "Not found" };

  return {
    title: album.title,
    description: album.description ?? `Photographs from ${album.title}.`,
  };
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params;

  const album = await db.album.findUnique({
    where: { slug },
    include: {
      media: {
        where: { isPublic: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!album || !album.isPublic) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/gallery"
        className="no-print inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        All albums
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="font-serif text-[34px] leading-tight tracking-tight sm:text-[40px]">
          {album.title}
        </h1>
        <p className="mt-2 text-[13.5px] text-ink-3">
          {album.media.length} {album.media.length === 1 ? "photo" : "photos"}
          {album.eventDate ? ` · ${formatFullDate(album.eventDate)}` : ""}
        </p>
        {album.description ? (
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            {album.description}
          </p>
        ) : null}
      </header>

      {album.media.length > 0 ? (
        <PhotoGrid items={album.media} />
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed border-line-2 px-4 py-10 text-center text-sm text-ink-3">
          This album has no public photos.
        </p>
      )}
    </div>
  );
}
