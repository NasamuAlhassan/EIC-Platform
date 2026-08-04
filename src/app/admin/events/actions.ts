"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { recordAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { site } from "@/lib/config";
import { formatFullDate, formatTime } from "@/lib/utils";

export type EventState = { errors?: Record<string, string> };

const schema = z.object({
  title: z.string().trim().min(3, "Give the event a title.").max(200),
  description: z.string().trim().max(4000).optional(),
  agenda: z.string().trim().max(6000).optional(),
  location: z.string().trim().max(200).optional(),
  requiredMaterials: z.string().trim().max(500).optional(),
  type: z.enum([
    "MEETING",
    "DEADLINE",
    "TRAINING",
    "PUBLICATION",
    "SOCIAL",
    "OTHER",
  ]),
  date: z.string().min(1, "Choose a date."),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean(),
  isPublic: z.boolean(),
  rsvpEnabled: z.boolean(),
  minRole: z.enum(["MEMBER", "EDITOR", "EXECUTIVE", "ADMIN"]),
  notify: z.boolean(),
});

function parseForm(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    agenda: formData.get("agenda"),
    location: formData.get("location"),
    requiredMaterials: formData.get("requiredMaterials"),
    type: formData.get("type"),
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    allDay: formData.get("allDay") === "on",
    isPublic: formData.get("isPublic") === "on",
    rsvpEnabled: formData.get("rsvpEnabled") === "on",
    minRole: formData.get("minRole"),
    notify: formData.get("notify") === "on",
  });
}

function toErrors(error: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const i of error.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

/** Builds a Date from the separate date and time inputs. */
function combine(date: string, time?: string) {
  const d = new Date(`${date}T${time && time.length > 0 ? time : "00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEvent(
  _prev: EventState,
  formData: FormData,
): Promise<EventState> {
  const user = await requireRole("EXECUTIVE");

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: toErrors(parsed.error) };

  const startsAt = combine(parsed.data.date, parsed.data.startTime);
  if (!startsAt) return { errors: { date: "That date couldn't be read." } };

  const endsAt = parsed.data.endTime
    ? combine(parsed.data.date, parsed.data.endTime)
    : null;

  if (endsAt && endsAt <= startsAt) {
    return { errors: { endTime: "The end time must be after the start." } };
  }

  const event = await db.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      agenda: parsed.data.agenda || null,
      location: parsed.data.location || null,
      requiredMaterials: parsed.data.requiredMaterials || null,
      type: parsed.data.type,
      startsAt,
      endsAt,
      allDay: parsed.data.allDay,
      isPublic: parsed.data.isPublic,
      rsvpEnabled: parsed.data.rsvpEnabled,
      minRole: parsed.data.minRole,
      createdById: user.id,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "event.create",
    entityType: "Event",
    entityId: event.id,
    summary: `Scheduled "${event.title}" for ${formatFullDate(event.startsAt)}`,
  });

  if (parsed.data.notify) {
    const recipients = await db.user.findMany({
      where: { status: { not: "ARCHIVED" }, emailNotifications: true },
      select: { email: true },
    });

    await sendEmail({
      to: recipients.map((r) => r.email),
      subject: `New in the calendar: ${event.title}`,
      body: [
        `${event.title}`,
        `${formatFullDate(event.startsAt)}${
          event.allDay ? " (all day)" : ` at ${formatTime(event.startsAt)}`
        }`,
        event.location ? `Where: ${event.location}` : "",
        event.description ?? "",
        event.rsvpEnabled ? "Please RSVP in the portal." : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      action: {
        label: "Open the event",
        url: `${site.url}/portal/events/${event.id}`,
      },
    });
  }

  revalidatePath("/admin/events");
  revalidatePath("/portal/events");
  revalidatePath("/events");

  redirect("/admin/events?created=1");
}

export async function updateEvent(
  _prev: EventState,
  formData: FormData,
): Promise<EventState> {
  const user = await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return { errors: { form: "No event selected." } };

  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: toErrors(parsed.error) };

  const startsAt = combine(parsed.data.date, parsed.data.startTime);
  if (!startsAt) return { errors: { date: "That date couldn't be read." } };

  const endsAt = parsed.data.endTime
    ? combine(parsed.data.date, parsed.data.endTime)
    : null;

  if (endsAt && endsAt <= startsAt) {
    return { errors: { endTime: "The end time must be after the start." } };
  }

  await db.event.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      agenda: parsed.data.agenda || null,
      location: parsed.data.location || null,
      requiredMaterials: parsed.data.requiredMaterials || null,
      type: parsed.data.type,
      startsAt,
      endsAt,
      allDay: parsed.data.allDay,
      isPublic: parsed.data.isPublic,
      rsvpEnabled: parsed.data.rsvpEnabled,
      minRole: parsed.data.minRole,
    },
  });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "event.update",
    entityType: "Event",
    entityId: id,
    summary: `Updated "${parsed.data.title}"`,
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath("/portal/events");
  revalidatePath("/events");

  redirect("/admin/events?updated=1");
}

export async function deleteEvent(formData: FormData) {
  const user = await requireRole("EXECUTIVE");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const event = await db.event.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!event) return;

  await db.event.delete({ where: { id } });

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "event.delete",
    entityType: "Event",
    entityId: id,
    summary: `Deleted "${event.title}"`,
  });

  revalidatePath("/admin/events");
  revalidatePath("/portal/events");
  revalidatePath("/events");
}

/** Records who actually turned up, turning RSVPs into an attendance register. */
export async function markAttendance(formData: FormData) {
  const user = await requireRole("EXECUTIVE");
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return;

  const rsvps = await db.rsvp.findMany({
    where: { eventId },
    select: { id: true },
  });

  await Promise.all(
    rsvps.map((r) =>
      db.rsvp.update({
        where: { id: r.id },
        data: { attended: formData.get(`attended_${r.id}`) === "on" },
      }),
    ),
  );

  await recordAudit({
    actorId: user.id,
    actorName: user.name,
    action: "event.attendance",
    entityType: "Event",
    entityId: eventId,
    summary: `Recorded attendance for ${rsvps.length} responses`,
  });

  revalidatePath(`/admin/events/${eventId}`);
}
