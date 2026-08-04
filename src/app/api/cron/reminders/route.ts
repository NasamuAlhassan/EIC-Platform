import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { sendDueEventReminders, reminderWindowHours } from "@/lib/reminders";

/**
 * Scheduled job: email members about events happening soon.
 *
 * Called by the cron entry in vercel.json. Also runnable by hand by an
 * administrator, so the Board can verify it works without waiting a day —
 * add ?dryRun=1 to see who would be emailed without sending anything.
 *
 * This route talks to the database and the email provider, so it must never be
 * cached or statically evaluated.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time compare, so the secret can't be recovered by timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function authorise(request: Request): Promise<
  { ok: true; via: "cron" | "admin"; actor?: string } | { ok: false }
> {
  const expected = process.env.CRON_SECRET;

  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the variable is
  // set on the project.
  if (expected) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token && secretMatches(token, expected)) return { ok: true, via: "cron" };
  }

  // Manual run by an administrator.
  const session = await auth();
  if (session?.user && can.exportData(session.user.role)) {
    return { ok: true, via: "admin", actor: session.user.name ?? session.user.email ?? undefined };
  }

  return { ok: false };
}

export async function GET(request: Request) {
  const authorised = await authorise(request);

  if (!authorised.ok) {
    /*
     * 404 rather than 401: this endpoint's existence is not something an
     * anonymous caller needs confirmed, and a 401 invites guessing at the
     * secret.
     */
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const windowParam = Number(url.searchParams.get("windowHours"));
  const windowHours =
    Number.isFinite(windowParam) && windowParam > 0 && windowParam <= 24 * 14
      ? windowParam
      : reminderWindowHours();

  try {
    const run = await sendDueEventReminders({ windowHours, dryRun });

    // Worth a trail entry when it actually did something — an unexplained
    // "why did everyone get an email" is exactly what the log is for.
    if (!dryRun && run.eventsReminded > 0) {
      await recordAudit({
        actorName:
          authorised.via === "admin"
            ? (authorised.actor ?? "An administrator")
            : "Scheduled job",
        action: "event.reminders",
        entityType: "System",
        summary:
          `Sent reminders for ${run.eventsReminded} ` +
          `${run.eventsReminded === 1 ? "event" : "events"} ` +
          `to ${run.emailsSent} ${run.emailsSent === 1 ? "member" : "members"}`,
      });
    }

    return NextResponse.json(
      { ok: true, dryRun, ...run },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[cron/reminders] failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
