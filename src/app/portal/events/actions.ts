"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { visibleMinRoles } from "@/lib/rbac";

const rsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["ATTENDING", "NOT_ATTENDING", "MAYBE"]),
  note: z.string().trim().max(300).optional(),
});

export type RsvpState = { ok?: boolean; error?: string };

export async function setRsvp(
  _prev: RsvpState,
  formData: FormData,
): Promise<RsvpState> {
  const parsed = rsvpSchema.safeParse({
    eventId: formData.get("eventId"),
    status: formData.get("status"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) return { error: "That response wasn't understood." };

  const user = await getPortalUser();

  // Confirm the member is actually allowed to see this event before recording
  // a response to it.
  const event = await db.event.findFirst({
    where: {
      id: parsed.data.eventId,
      minRole: { in: visibleMinRoles(user.role) },
    },
    select: { id: true, rsvpEnabled: true, startsAt: true },
  });

  if (!event) return { error: "That event isn't available to you." };
  if (!event.rsvpEnabled) return { error: "RSVPs are closed for this event." };

  await db.rsvp.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    create: {
      eventId: event.id,
      userId: user.id,
      status: parsed.data.status,
      note: parsed.data.note || null,
    },
    update: {
      status: parsed.data.status,
      note: parsed.data.note || null,
      respondedAt: new Date(),
    },
  });

  revalidatePath("/portal/events");
  revalidatePath(`/portal/events/${event.id}`);
  revalidatePath("/portal");

  return { ok: true };
}
