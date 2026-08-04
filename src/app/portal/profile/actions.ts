"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { putFile, deleteFile, UploadError, IMAGE_MIME } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export type ProfileState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please give your full name.").max(120),
  position: z.string().trim().max(120).optional(),
  classYear: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(600).optional(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getPortalUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    position: formData.get("position"),
    classYear: formData.get("classYear"),
    phone: formData.get("phone"),
    bio: formData.get("bio"),
    showEmail: formData.get("showEmail") === "on",
    showPhone: formData.get("showPhone") === "on",
    emailNotifications: formData.get("emailNotifications") === "on",
    smsNotifications: formData.get("smsNotifications") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] ??= issue.message;
    }
    return { errors };
  }

  let avatarUrl: string | undefined;
  const avatar = formData.get("avatar");

  if (avatar instanceof File && avatar.size > 0) {
    if (!IMAGE_MIME.has(avatar.type)) {
      return { errors: { avatar: "Choose a JPEG, PNG, WebP, or GIF image." } };
    }
    try {
      const stored = await putFile(avatar, { prefix: "avatars" });
      avatarUrl = stored.url;

      // Replace rather than accumulate — old avatars are dead weight.
      const existing = await db.user.findUnique({
        where: { id: user.id },
        select: { avatarUrl: true },
      });
      if (existing?.avatarUrl) await deleteFile(existing.avatarUrl);
    } catch (err) {
      return {
        errors: {
          avatar:
            err instanceof UploadError
              ? err.message
              : "That image couldn't be uploaded.",
        },
      };
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      position: parsed.data.position || null,
      classYear: parsed.data.classYear || null,
      phone: parsed.data.phone || null,
      bio: parsed.data.bio || null,
      showEmail: parsed.data.showEmail,
      showPhone: parsed.data.showPhone,
      emailNotifications: parsed.data.emailNotifications,
      smsNotifications: parsed.data.smsNotifications,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  revalidatePath("/portal", "layout");
  revalidatePath("/portal/directory");
  revalidatePath("/about");

  return { ok: true, message: "Your profile has been updated." };
}

/* -------------------------------------------------------------------------- */

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(200, "That's too long."),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  })
  .refine((d) => d.next !== d.current, {
    path: ["next"],
    message: "Choose a password different from your current one.",
  });

export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getPortalUser();

  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] ??= issue.message;
    }
    return { errors };
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row) return { errors: { current: "Account not found." } };

  const ok = await bcrypt.compare(parsed.data.current, row.passwordHash);
  if (!ok) return { errors: { current: "That isn't your current password." } };

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.next, 12),
      mustChangePassword: false,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "user.password_change",
    entityType: "User",
    entityId: user.id,
    summary: `${user.name} changed their own password`,
  });

  return { ok: true, message: "Your password has been changed." };
}
