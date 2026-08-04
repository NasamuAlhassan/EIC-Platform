"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { putFile, deleteFile, UploadError, IMAGE_MIME } from "@/lib/storage";
import { uniqueSlug } from "@/lib/utils";

export type PublicationState = { errors?: Record<string, string> };

const schema = z.object({
  title: z.string().trim().min(2, "Give the publication a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(["NEWSLETTER", "MAGAZINE", "ARTICLE", "SPECIAL_EDITION"]),
  issueLabel: z.string().trim().max(80).optional(),
  publishedAt: z.string().optional(),
  pageCount: z.coerce.number().int().min(0).max(2000).optional(),
  featured: z.boolean(),
  isPublic: z.boolean(),
});

export async function createPublication(
  _prev: PublicationState,
  formData: FormData,
): Promise<PublicationState> {
  const user = await requireRole("EDITOR");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    issueLabel: formData.get("issueLabel"),
    publishedAt: formData.get("publishedAt") || undefined,
    pageCount: formData.get("pageCount") || undefined,
    featured: formData.get("featured") === "on",
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const pdf = formData.get("file");
  const cover = formData.get("cover");

  let fileUrl: string | null = null;
  let fileSize: number | null = null;

  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.type !== "application/pdf") {
      return { errors: { file: "The publication itself must be a PDF." } };
    }
    try {
      const stored = await putFile(pdf, { prefix: "publications" });
      fileUrl = stored.url;
      fileSize = stored.size;
    } catch (err) {
      return {
        errors: {
          file:
            err instanceof UploadError ? err.message : "That PDF couldn't be uploaded.",
        },
      };
    }
  }

  let coverImageUrl: string | null = null;
  if (cover instanceof File && cover.size > 0) {
    if (!IMAGE_MIME.has(cover.type)) {
      return { errors: { cover: "The cover must be an image." } };
    }
    try {
      const stored = await putFile(cover, { prefix: "covers" });
      coverImageUrl = stored.url;
    } catch (err) {
      return {
        errors: {
          cover:
            err instanceof UploadError
              ? err.message
              : "That cover couldn't be uploaded.",
        },
      };
    }
  }

  const slug = await uniqueSlug(
    parsed.data.issueLabel
      ? `${parsed.data.title}-${parsed.data.issueLabel}`
      : parsed.data.title,
    async (candidate) =>
      Boolean(
        await db.publication.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
  );

  const publishedAt = parsed.data.publishedAt
    ? new Date(parsed.data.publishedAt)
    : new Date();

  // Only one publication is the featured one at a time.
  if (parsed.data.featured) {
    await db.publication.updateMany({
      where: { featured: true },
      data: { featured: false },
    });
  }

  const publication = await db.publication.create({
    data: {
      title: parsed.data.title,
      slug,
      description: parsed.data.description || null,
      type: parsed.data.type,
      issueLabel: parsed.data.issueLabel || null,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      pageCount: parsed.data.pageCount || null,
      featured: parsed.data.featured,
      isPublic: parsed.data.isPublic,
      fileUrl,
      fileSize,
      coverImageUrl,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "publication.create",
    entityType: "Publication",
    entityId: publication.id,
    summary: `Published "${publication.title}"`,
  });

  revalidatePath("/admin/publications");
  revalidatePath("/publications");
  revalidatePath("/");

  redirect("/admin/publications?created=1");
}

export async function deletePublication(formData: FormData) {
  const user = await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const publication = await db.publication.findUnique({
    where: { id },
    select: { id: true, title: true, fileUrl: true, coverImageUrl: true },
  });
  if (!publication) return;

  await db.publication.delete({ where: { id } });
  if (publication.fileUrl) await deleteFile(publication.fileUrl);
  if (publication.coverImageUrl) await deleteFile(publication.coverImageUrl);

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "publication.delete",
    entityType: "Publication",
    entityId: id,
    summary: `Deleted "${publication.title}"`,
  });

  revalidatePath("/admin/publications");
  revalidatePath("/publications");
  revalidatePath("/");
}

export async function toggleFeatured(formData: FormData) {
  await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const publication = await db.publication.findUnique({
    where: { id },
    select: { featured: true },
  });
  if (!publication) return;

  if (!publication.featured) {
    await db.publication.updateMany({
      where: { featured: true },
      data: { featured: false },
    });
  }

  await db.publication.update({
    where: { id },
    data: { featured: !publication.featured },
  });

  revalidatePath("/admin/publications");
  revalidatePath("/publications");
  revalidatePath("/");
}
