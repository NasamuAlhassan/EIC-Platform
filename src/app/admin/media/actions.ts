"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { putFile, deleteFile, UploadError, IMAGE_MIME } from "@/lib/storage";
import { uniqueSlug } from "@/lib/utils";

export type MediaState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const albumSchema = z.object({
  title: z.string().trim().min(2, "Give the album a name.").max(160),
  description: z.string().trim().max(1000).optional(),
  eventDate: z.string().optional(),
  isPublic: z.boolean(),
});

export async function createAlbum(
  _prev: MediaState,
  formData: FormData,
): Promise<MediaState> {
  const user = await requireRole("EDITOR");

  const parsed = albumSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate") || undefined,
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
    Boolean(
      await db.album.findUnique({
        where: { slug: candidate },
        select: { id: true },
      }),
    ),
  );

  const eventDate = parsed.data.eventDate
    ? new Date(parsed.data.eventDate)
    : null;

  const album = await db.album.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      eventDate:
        eventDate && !Number.isNaN(eventDate.getTime()) ? eventDate : null,
      isPublic: parsed.data.isPublic,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "album.create",
    entityType: "Album",
    entityId: album.id,
    summary: `Created album "${album.title}"`,
  });

  revalidatePath("/admin/media");
  revalidatePath("/gallery");

  return { ok: true, message: `Album "${album.title}" created.` };
}

/* -------------------------------------------------------------------------- */

export async function uploadMedia(
  _prev: MediaState,
  formData: FormData,
): Promise<MediaState> {
  const user = await requireRole("EDITOR");

  const albumId = String(formData.get("albumId") ?? "");
  if (!albumId) return { errors: { albumId: "Choose an album." } };

  const album = await db.album.findUnique({
    where: { id: albumId },
    select: { id: true, title: true, isPublic: true },
  });
  if (!album) return { errors: { albumId: "That album no longer exists." } };

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return { errors: { photos: "Choose at least one photo." } };
  if (files.length > 20) {
    return { errors: { photos: "Upload at most 20 photos at a time." } };
  }

  // A photo can't be more public than the album it lives in.
  const makePublic = album.isPublic && formData.get("isPublic") === "on";
  const caption = String(formData.get("caption") ?? "").trim() || null;

  let uploaded = 0;
  const failures: string[] = [];

  for (const file of files) {
    if (!IMAGE_MIME.has(file.type)) {
      failures.push(`${file.name}: not an image`);
      continue;
    }
    try {
      const stored = await putFile(file, { prefix: "media" });
      await db.media.create({
        data: {
          albumId: album.id,
          url: stored.url,
          caption,
          mimeType: stored.contentType,
          fileSize: stored.size,
          isPublic: makePublic,
          uploadedById: user.id,
        },
      });
      uploaded += 1;
    } catch (err) {
      failures.push(
        `${file.name}: ${err instanceof UploadError ? err.message : "upload failed"}`,
      );
    }
  }

  if (uploaded > 0) {
    await recordAudit({
      actorId: user.id,
      actorName: user.name,
      action: "media.upload",
      entityType: "Album",
      entityId: album.id,
      summary: `Added ${uploaded} photo${uploaded === 1 ? "" : "s"} to "${album.title}"`,
    });
  }

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${album.id}`);

  if (uploaded === 0) {
    return { errors: { photos: failures.join("; ") || "Nothing was uploaded." } };
  }

  return {
    ok: true,
    message:
      `${uploaded} photo${uploaded === 1 ? "" : "s"} added to "${album.title}".` +
      (failures.length > 0 ? ` ${failures.length} failed: ${failures.join("; ")}` : ""),
  };
}

/* -------------------------------------------------------------------------- */

export async function toggleAlbumVisibility(formData: FormData) {
  await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const album = await db.album.findUnique({
    where: { id },
    select: { isPublic: true },
  });
  if (!album) return;

  const next = !album.isPublic;

  await db.album.update({ where: { id }, data: { isPublic: next } });

  // Hiding an album must hide its photos too, or they'd stay reachable.
  if (!next) {
    await db.media.updateMany({
      where: { albumId: id },
      data: { isPublic: false },
    });
  }

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
}

export async function deleteMedia(formData: FormData) {
  await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const media = await db.media.findUnique({
    where: { id },
    select: { url: true },
  });
  if (!media) return;

  await db.media.delete({ where: { id } });
  await deleteFile(media.url);

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
}

export async function deleteAlbum(formData: FormData) {
  const user = await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const album = await db.album.findUnique({
    where: { id },
    select: { title: true, media: { select: { id: true, url: true } } },
  });
  if (!album) return;

  await db.media.deleteMany({ where: { albumId: id } });
  await db.album.delete({ where: { id } });
  await Promise.all(album.media.map((m) => deleteFile(m.url)));

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "album.delete",
    entityType: "Album",
    entityId: id,
    summary: `Deleted album "${album.title}" and ${album.media.length} photos`,
  });

  revalidatePath("/admin/media");
  revalidatePath("/gallery");
}
