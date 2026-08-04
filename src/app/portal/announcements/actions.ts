"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPortalUser, announcementVisibility } from "@/lib/portal";

const idsSchema = z.array(z.string().min(1)).max(200);

/**
 * Marks announcements as read for the current member.
 *
 * Re-checks visibility rather than trusting the ids the browser sent, so a
 * crafted request can't create read receipts for notices the member was never
 * shown.
 */
export async function markRead(ids: string[]) {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return;

  const user = await getPortalUser();

  const allowed = await db.announcement.findMany({
    where: { AND: [{ id: { in: parsed.data } }, announcementVisibility(user.role)] },
    select: { id: true },
  });

  if (allowed.length === 0) return;

  await db.announcementRead.createMany({
    data: allowed.map((a) => ({ announcementId: a.id, userId: user.id })),
    skipDuplicates: true,
  });

  // The unread badge lives in the portal layout.
  revalidatePath("/portal", "layout");
}
