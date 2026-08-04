"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { putFile, deleteFile, UploadError, IMAGE_MIME } from "@/lib/storage";
import { uniqueSlug, truncate, toPlainText } from "@/lib/utils";

export type PostState = { errors?: Record<string, string> };

const schema = z.object({
  title: z.string().trim().min(3, "Give the post a headline.").max(200),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().trim().min(20, "Write the post.").max(40000),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function createPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const user = await requireRole("EDITOR");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const cover = formData.get("cover");
  let coverImageUrl: string | null = null;

  if (cover instanceof File && cover.size > 0) {
    if (!IMAGE_MIME.has(cover.type)) {
      return { errors: { cover: "The cover must be an image." } };
    }
    try {
      const stored = await putFile(cover, { prefix: "posts" });
      coverImageUrl = stored.url;
    } catch (err) {
      return {
        errors: {
          cover:
            err instanceof UploadError
              ? err.message
              : "That image couldn't be uploaded.",
        },
      };
    }
  }

  const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
    Boolean(
      await db.post.findUnique({
        where: { slug: candidate },
        select: { id: true },
      }),
    ),
  );

  const post = await db.post.create({
    data: {
      title: parsed.data.title,
      slug,
      excerpt:
        parsed.data.excerpt || truncate(toPlainText(parsed.data.body), 180),
      body: parsed.data.body,
      status: parsed.data.status,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
      coverImageUrl,
      authorId: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "post.create",
    entityType: "Post",
    entityId: post.id,
    summary: `${post.status === "PUBLISHED" ? "Published" : "Drafted"} "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/news");
  revalidatePath("/");

  redirect("/admin/posts?created=1");
}

export async function togglePostStatus(formData: FormData) {
  const user = await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const post = await db.post.findUnique({
    where: { id },
    select: { status: true, title: true, publishedAt: true },
  });
  if (!post) return;

  const next = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

  await db.post.update({
    where: { id },
    data: {
      status: next,
      // Keep the original publication date if it's being re-published.
      publishedAt:
        next === "PUBLISHED" ? (post.publishedAt ?? new Date()) : null,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "post.status",
    entityType: "Post",
    entityId: id,
    summary: `"${post.title}" → ${next.toLowerCase()}`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/news");
  revalidatePath("/");
}

export async function deletePost(formData: FormData) {
  const user = await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const post = await db.post.findUnique({
    where: { id },
    select: { title: true, coverImageUrl: true },
  });
  if (!post) return;

  await db.post.delete({ where: { id } });
  if (post.coverImageUrl) await deleteFile(post.coverImageUrl);

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "post.delete",
    entityType: "Post",
    entityId: id,
    summary: `Deleted "${post.title}"`,
  });

  revalidatePath("/admin/posts");
  revalidatePath("/news");
  revalidatePath("/");
}
