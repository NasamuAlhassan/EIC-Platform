"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { putFile, deleteFile, UploadError, formatBytes } from "@/lib/storage";
import { slugify } from "@/lib/utils";

export type DocumentState = {
  ok?: boolean;
  errors?: Record<string, string>;
};

const schema = z.object({
  title: z.string().trim().min(2, "Give the document a title.").max(200),
  description: z.string().trim().max(1000).optional(),
  type: z.enum([
    "MINUTES",
    "ATTENDANCE",
    "REPORT",
    "TEMPLATE",
    "GUIDELINE",
    "CONSTITUTION",
    "FINANCE",
    "OTHER",
  ]),
  minRole: z.enum(["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"]),
  isPublic: z.boolean(),
  recordDate: z.string().optional(),
  folderId: z.string().optional(),
  newFolder: z.string().trim().max(80).optional(),
  tags: z.string().trim().max(300).optional(),
});

export async function uploadDocument(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const user = await requireRole("EDITOR");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    minRole: formData.get("minRole"),
    isPublic: formData.get("isPublic") === "on",
    recordDate: formData.get("recordDate") || undefined,
    folderId: formData.get("folderId") || undefined,
    newFolder: formData.get("newFolder") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: "Choose a file to upload." } };
  }

  let stored;
  try {
    stored = await putFile(file, { prefix: "documents" });
  } catch (err) {
    return {
      errors: {
        file:
          err instanceof UploadError
            ? err.message
            : "That file couldn't be uploaded.",
      },
    };
  }

  // Creating a folder inline saves a trip to a separate screen.
  let folderId = parsed.data.folderId || null;
  if (parsed.data.newFolder) {
    const name = parsed.data.newFolder;
    const slug = slugify(name);
    const folder = await db.folder.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
    folderId = folder.id;
  }

  const tagNames = (parsed.data.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const tagIds: string[] = [];
  for (const name of tagNames) {
    const slug = slugify(name);
    if (!slug) continue;
    const tag = await db.tag.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
    tagIds.push(tag.id);
  }

  const recordDate = parsed.data.recordDate
    ? new Date(parsed.data.recordDate)
    : new Date();

  const doc = await db.document.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      type: parsed.data.type,
      minRole: parsed.data.minRole,
      isPublic: parsed.data.isPublic,
      recordDate: Number.isNaN(recordDate.getTime()) ? new Date() : recordDate,
      folderId,
      fileUrl: stored.url,
      fileName: file.name,
      fileSize: stored.size,
      mimeType: stored.contentType,
      uploadedById: user.id,
      ...(tagIds.length > 0
        ? { tags: { connect: tagIds.map((id) => ({ id })) } }
        : {}),
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "document.upload",
    entityType: "Document",
    entityId: doc.id,
    summary: `Uploaded "${doc.title}" (${formatBytes(doc.fileSize)})`,
  });

  revalidatePath("/admin/documents");
  revalidatePath("/portal/documents");
  revalidatePath("/portal");

  redirect("/admin/documents?uploaded=1");
}

export async function deleteDocument(formData: FormData) {
  const user = await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const doc = await db.document.findUnique({
    where: { id },
    select: { id: true, title: true, fileUrl: true },
  });
  if (!doc) return;

  await db.document.delete({ where: { id } });
  await deleteFile(doc.fileUrl);

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "document.delete",
    entityType: "Document",
    entityId: doc.id,
    summary: `Deleted "${doc.title}"`,
  });

  revalidatePath("/admin/documents");
  revalidatePath("/portal/documents");
}
