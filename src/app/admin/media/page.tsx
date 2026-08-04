import type { Metadata } from "next";
import { Images, Globe, Lock, Trash2 } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { can } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { formatBytes } from "@/lib/storage";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { AlbumForm, UploadForm } from "./media-forms";
import { deleteAlbum, deleteMedia, toggleAlbumVisibility } from "./actions";

export const metadata: Metadata = { title: "Media" };

export default async function AdminMediaPage() {
  const user = await requireRole("EDITOR");

  const [albums, totals] = await Promise.all([
    db.album.findMany({
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      include: {
        media: { orderBy: { createdAt: "asc" } },
        _count: { select: { media: true } },
      },
    }),
    db.media.aggregate({ _sum: { fileSize: true }, _count: true }),
  ]);

  return (
    <div>
      <PageHeader
        title="Media & albums"
        description={`${totals._count} photos · ${formatBytes(totals._sum.fileSize ?? 0)} stored`}
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="New album"
            description="Group photos by event or publication."
          />
          <div className="p-5">
            <AlbumForm />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upload photos"
            description="Add images to an existing album."
          />
          <div className="p-5">
            <UploadForm
              albums={albums.map((a) => ({
                id: a.id,
                title: a.title,
                isPublic: a.isPublic,
              }))}
            />
          </div>
        </Card>
      </div>

      {albums.length > 0 ? (
        <div className="space-y-6">
          {albums.map((album) => (
            <Card key={album.id}>
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {album.title}
                    {album.isPublic ? (
                      <Badge tone="ok">
                        <Globe size={10} aria-hidden />
                        Public
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        <Lock size={10} aria-hidden />
                        Private
                      </Badge>
                    )}
                  </span>
                }
                description={`${album._count.media} ${
                  album._count.media === 1 ? "photo" : "photos"
                }${album.eventDate ? ` · ${formatDate(album.eventDate)}` : ""}`}
                action={
                  <div className="flex gap-1.5">
                    <form action={toggleAlbumVisibility}>
                      <input type="hidden" name="id" value={album.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        {album.isPublic ? "Make private" : "Make public"}
                      </Button>
                    </form>
                    {can.manageDocuments(user.role) ? (
                      <form action={deleteAlbum}>
                        <input type="hidden" name="id" value={album.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          aria-label={`Delete album ${album.title}`}
                          className="text-ink-3 hover:text-danger"
                        >
                          <Trash2 size={14} aria-hidden />
                        </Button>
                      </form>
                    ) : null}
                  </div>
                }
              />

              {album.media.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2.5 p-4 sm:grid-cols-5 lg:grid-cols-6">
                  {album.media.map((m) => (
                    <li key={m.id} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.url}
                        alt={m.caption ?? ""}
                        loading="lazy"
                        className="aspect-square w-full rounded-md border border-line object-cover"
                      />
                      {!m.isPublic && album.isPublic ? (
                        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          Hidden
                        </span>
                      ) : null}
                      <form
                        action={deleteMedia}
                        className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          aria-label="Delete this photo"
                          className="grid h-6 w-6 place-items-center rounded bg-black/60 text-white hover:bg-danger"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-center text-[13px] text-ink-3">
                  No photos in this album yet.
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Images size={20} />}
            title="No albums yet"
            description="Create an album above, then upload photos into it."
          />
        </Card>
      )}
    </div>
  );
}
