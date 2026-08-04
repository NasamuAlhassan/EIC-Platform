import "server-only";

import { db } from "./db";
import { sendEmail } from "./email";
import { rolesWithAccessTo } from "./rbac";
import { site } from "./config";
import { formatFullDate, formatTime } from "./utils";

/**
 * Event reminders — the "email members the day before" part of the calendar.
 *
 * Driven by a scheduled request to /api/cron/reminders rather than anything
 * in-process: a serverless deployment has no long-running timer to hang a job
 * off, so the schedule lives in vercel.json and this is what it calls.
 */

/**
 * How far ahead to look, in hours.
 *
 * 36 rather than 24 because the schedule is daily. With a single morning run, a
 * 24-hour window would miss anything happening later than the run time
 * tomorrow — an evening meeting would not be reminded until the morning it
 * takes place. 36 hours means the run the day before always catches it.
 *
 * If you move to an hourly schedule, set REMINDER_WINDOW_HOURS=24 and reminders
 * land almost exactly a day ahead.
 */
export const DEFAULT_WINDOW_HOURS = 36;

export function reminderWindowHours(): number {
  const raw = Number(process.env.REMINDER_WINDOW_HOURS);
  if (!Number.isFinite(raw) || raw <= 0 || raw > 24 * 14) {
    return DEFAULT_WINDOW_HOURS;
  }
  return raw;
}

export type ReminderOutcome = {
  eventId: string;
  title: string;
  startsAt: Date;
  recipients: number;
  /** True when nothing actually left the building (no email provider set up). */
  simulated: boolean;
  error?: string;
};

export type ReminderRun = {
  ranAt: string;
  windowHours: number;
  eventsDue: number;
  eventsReminded: number;
  emailsSent: number;
  results: ReminderOutcome[];
};

/**
 * Sends a reminder for every event starting inside the window that hasn't had
 * one yet, and returns what it did.
 *
 * Safe to call repeatedly: `reminderSentAt` is claimed with a conditional
 * update before anything is sent, so two overlapping runs can't both remind the
 * same event. If the send then fails the claim is released, and the next run
 * tries again.
 */
export async function sendDueEventReminders(options?: {
  now?: Date;
  windowHours?: number;
  /** Report what would be sent without sending or marking anything. */
  dryRun?: boolean;
}): Promise<ReminderRun> {
  const now = options?.now ?? new Date();
  const windowHours = options?.windowHours ?? reminderWindowHours();
  const dryRun = options?.dryRun ?? false;

  const until = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  const due = await db.event.findMany({
    where: {
      reminderSentAt: null,
      // Never remind about something that has already happened — a late cron
      // run shouldn't email everyone about yesterday's meeting.
      startsAt: { gte: now, lte: until },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      allDay: true,
      minRole: true,
      rsvpEnabled: true,
      requiredMaterials: true,
    },
  });

  const results: ReminderOutcome[] = [];
  let emailsSent = 0;

  for (const event of due) {
    const recipients = await db.user.findMany({
      where: {
        status: { not: "ARCHIVED" },
        emailNotifications: true,
        role: { in: rolesWithAccessTo(event.minRole) },
        // Anyone who has already said they aren't coming doesn't need chasing.
        NOT: {
          rsvps: { some: { eventId: event.id, status: "NOT_ATTENDING" } },
        },
      },
      select: { email: true },
    });

    if (recipients.length === 0) {
      // Mark it done anyway — there is no one to tell, and leaving it unclaimed
      // would make every future run re-examine it.
      if (!dryRun) {
        await db.event.updateMany({
          where: { id: event.id, reminderSentAt: null },
          data: { reminderSentAt: now },
        });
      }
      results.push({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        recipients: 0,
        simulated: true,
      });
      continue;
    }

    if (dryRun) {
      results.push({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        recipients: recipients.length,
        simulated: true,
      });
      continue;
    }

    // Claim it first. `updateMany` with the null check is atomic, so a second
    // run happening at the same moment gets a count of 0 and moves on.
    const claim = await db.event.updateMany({
      where: { id: event.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claim.count === 0) continue;

    const when = event.allDay
      ? `${formatFullDate(event.startsAt)} (all day)`
      : `${formatFullDate(event.startsAt)} at ${formatTime(event.startsAt)}`;

    const result = await sendEmail({
      to: recipients.map((r) => r.email),
      subject: `Reminder: ${event.title} — ${when}`,
      body: [
        `A reminder that ${event.title} is coming up.`,
        `When: ${when}`,
        event.location ? `Where: ${event.location}` : "",
        event.requiredMaterials ? `Bring: ${event.requiredMaterials}` : "",
        event.description ?? "",
        event.rsvpEnabled
          ? "If your plans have changed, update your RSVP in the portal."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      action: {
        label: "Open the event",
        url: `${site.url}/portal/events/${event.id}`,
      },
    });

    if (!result.ok) {
      // Release the claim so the next run retries rather than silently
      // swallowing the reminder.
      await db.event.updateMany({
        where: { id: event.id },
        data: { reminderSentAt: null },
      });
      results.push({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        recipients: recipients.length,
        simulated: result.simulated,
        error: result.error ?? "Email provider rejected the message",
      });
      continue;
    }

    emailsSent += result.delivered;
    results.push({
      eventId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      recipients: result.delivered,
      simulated: result.simulated,
    });
  }

  return {
    ranAt: now.toISOString(),
    windowHours,
    eventsDue: due.length,
    eventsReminded: results.filter((r) => !r.error).length,
    emailsSent,
    results,
  };
}
