"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { putFile, deleteFile, UploadError, IMAGE_MIME } from "@/lib/storage";

export type AchievementState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const schema = z.object({
  title: z.string().trim().min(3, "Describe the achievement.").max(200),
  description: z.string().trim().max(1000).optional(),
  achievedAt: z.string().min(1, "When did this happen?"),
  featured: z.boolean(),
});

export async function createAchievement(
  _prev: AchievementState,
  formData: FormData,
): Promise<AchievementState> {
  const user = await requireRole("EDITOR");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    achievedAt: formData.get("achievedAt"),
    featured: formData.get("featured") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const achievedAt = new Date(parsed.data.achievedAt);
  if (Number.isNaN(achievedAt.getTime())) {
    return { errors: { achievedAt: "That date couldn't be read." } };
  }

  const image = formData.get("image");
  let imageUrl: string | null = null;

  if (image instanceof File && image.size > 0) {
    if (!IMAGE_MIME.has(image.type)) {
      return { errors: { image: "That needs to be an image." } };
    }
    try {
      const stored = await putFile(image, { prefix: "achievements" });
      imageUrl = stored.url;
    } catch (err) {
      return {
        errors: {
          image:
            err instanceof UploadError
              ? err.message
              : "That image couldn't be uploaded.",
        },
      };
    }
  }

  const achievement = await db.achievement.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      achievedAt,
      featured: parsed.data.featured,
      imageUrl,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "achievement.create",
    entityType: "Achievement",
    entityId: achievement.id,
    summary: `Recorded "${achievement.title}"`,
  });

  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
  revalidatePath("/");

  return { ok: true, message: "Achievement recorded." };
}

export async function deleteAchievement(formData: FormData) {
  await requireRole("EDITOR");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const achievement = await db.achievement.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  if (!achievement) return;

  await db.achievement.delete({ where: { id } });
  if (achievement.imageUrl) await deleteFile(achievement.imageUrl);

  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
  revalidatePath("/");
}
