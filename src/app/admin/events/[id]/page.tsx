import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, ClipboardCheck } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatFullDate } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
} from "@/components/ui";
import { EventForm } from "../event-form";
import { deleteEvent, markAttendance } from "../actions";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("EXECUTIVE");
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: {
      rsvps: {
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy: { status: "asc" },
      },
    },
  });

  if (!event) notFound();

  const isPast = event.startsAt < new Date();

  return (
    <div>
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Events
      </Link>

      <div className="mt-5">
        <PageHeader
          title="Edit event"
          description={formatFullDate(event.startsAt)}
          action={
            <form action={deleteEvent}>
              <input type="hidden" name="id" value={event.id} />
              <Button type="submit" variant="secondary" size="sm">
                <Trash2 size={14} aria-hidden />
                Delete
              </Button>
            </form>
          }
        />
      </div>

      <Card className="p-5">
        <EventForm event={event} />
      </Card>

      {/* Attendance register — only useful once the event has happened. */}
      {event.rsvps.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Attendance"
            description={
              isPast
                ? "Tick everyone who actually turned up, then save."
                : "Responses so far. You can record attendance after the event."
            }
          />
          <form action={markAttendance}>
            <input type="hidden" name="eventId" value={event.id} />
            <ul className="divide-y divide-line">
              {event.rsvps.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={r.user.name} src={r.user.avatarUrl} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">
                    {r.user.name}
                  </span>

                  {r.status === "ATTENDING" ? (
                    <Badge tone="ok">Said yes</Badge>
                  ) : r.status === "MAYBE" ? (
                    <Badge tone="warn">Maybe</Badge>
                  ) : (
                    <Badge tone="neutral">Said no</Badge>
                  )}

                  <label className="flex shrink-0 items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      name={`attended_${r.id}`}
                      defaultChecked={r.attended ?? false}
                      className="h-4 w-4 rounded border-line-2 accent-[var(--brand)]"
                    />
                    Attended
                  </label>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              <Button type="submit" variant="secondary" size="sm">
                <ClipboardCheck size={14} aria-hidden />
                Save attendance
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
