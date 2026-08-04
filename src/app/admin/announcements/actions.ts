"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";
import { truncate, toPlainText } from "@/lib/utils";

export type AnnouncementState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

const ROLES = ["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"] as const;

const schema = z.object({
  title: z.string().trim().min(3, "Give the notice a title.").max(200),
  body: z.string().trim().min(10, "Write the announcement.").max(8000),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  audienceRoles: z.array(z.enum(ROLES)),
  pinned: z.boolean(),
  expiresAt: z.string().optional(),
  sendEmail: z.boolean(),
});

export async function createAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const user = await requireRole("EXECUTIVE");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    priority: formData.get("priority"),
    audienceRoles: formData.getAll("audienceRoles").map(String),
    pinned: formData.get("pinned") === "on",
    expiresAt: formData.get("expiresAt") || undefined,
    sendEmail: formData.get("sendEmail") === "on",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }

  const expiresAt = parsed.data.expiresAt
    ? new Date(parsed.data.expiresAt)
    : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { errors: { expiresAt: "That date couldn't be read." } };
  }

  const announcement = await db.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority,
      // An empty audience means "everyone" — simpler than listing all roles.
      audienceRoles:
        parsed.data.audienceRoles.length === ROLES.length
          ? []
          : parsed.data.audienceRoles,
      pinned: parsed.data.pinned,
      expiresAt,
      authorId: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "announcement.create",
    entityType: "Announcement",
    entityId: announcement.id,
    summary: `Posted "${announcement.title}"`,
  });

  if (parsed.data.sendEmail) {
    const recipients = await db.user.findMany({
      where: {
        status: { not: "ARCHIVED" },
        emailNotifications: true,
        ...(announcement.audienceRoles.length > 0
          ? { role: { in: announcement.audienceRoles } }
          : {}),
      },
      select: { email: true },
    });

    const result = await sendEmail({
      to: recipients.map((r) => r.email),
      subject:
        parsed.data.priority === "URGENT"
          ? `[Urgent] ${announcement.title}`
          : announcement.title,
      body: `${truncate(toPlainText(announcement.body), 1500)}\n\n— ${user.name}, ${site.boardName}`,
      action: {
        label: "Read it in the portal",
        url: `${site.url}/portal/announcements#${announcement.id}`,
      },
    });

    if (result.ok) {
      await db.announcement.update({
        where: { id: announcement.id },
        data: { emailSentAt: new Date() },
      });
    }
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/portal/announcements");
  revalidatePath("/portal", "layout");

  redirect("/admin/announcements?created=1");
}

/* -------------------------------------------------------------------------- */

export async function deleteAnnouncement(formData: FormData) {
  const user = await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await db.announcement.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!existing) return;

  await db.announcement.delete({ where: { id } });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "announcement.delete",
    entityType: "Announcement",
    entityId: id,
    summary: `Deleted "${existing.title}"`,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/portal/announcements");
  revalidatePath("/portal", "layout");
}

export async function togglePinned(formData: FormData) {
  await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await db.announcement.findUnique({
    where: { id },
    select: { pinned: true },
  });
  if (!existing) return;

  await db.announcement.update({
    where: { id },
    data: { pinned: !existing.pinned },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/portal/announcements");
}
