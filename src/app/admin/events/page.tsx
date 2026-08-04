import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus, Globe, Users, BellRing } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatDate, formatTime, relativeDay } from "@/lib/utils";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { EVENT_LABEL } from "@/components/public-cards";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  await requireRole("EXECUTIVE");
  const { created, updated } = await searchParams;
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: {
        _count: { select: { rsvps: { where: { status: "ATTENDING" } } } },
      },
    }),
    db.event.findMany({
      where: { startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 25,
      include: {
        _count: { select: { rsvps: { where: { attended: true } } } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Events"
        description="Schedule meetings and deadlines, and record who attended."
        action={
          <ButtonLink href="/admin/events/new" size="sm">
            <Plus size={15} aria-hidden />
            New event
          </ButtonLink>
        }
      />

      {created ? (
        <Alert tone="ok" className="mb-5">
          Event scheduled.
        </Alert>
      ) : null}
      {updated ? (
        <Alert tone="ok" className="mb-5">
          Event updated.
        </Alert>
      ) : null}

      <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
        Upcoming
      </h2>

      {upcoming.length > 0 ? (
        <Card className="divide-y divide-line">
          {upcoming.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className="flex items-start gap-3.5 p-4 hover:bg-surface-2"
            >
              <div
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-surface-2 leading-none"
              >
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-accent">
                  {e.startsAt.toLocaleString("en", { month: "short" })}
                </span>
                <span className="font-serif text-[17px] font-semibold tabular-nums">
                  {e.startsAt.getDate()}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-medium">{e.title}</h3>
                  <Badge tone="neutral">{EVENT_LABEL[e.type]}</Badge>
                  {e.isPublic ? (
                    <Badge tone="ok">
                      <Globe size={10} aria-hidden />
                      Public
                    </Badge>
                  ) : null}
                  {e.reminderSentAt ? (
                    <Badge tone="brand">
                      <BellRing size={10} aria-hidden />
                      Reminded
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {relativeDay(e.startsAt)}
                  {!e.allDay ? ` · ${formatTime(e.startsAt)}` : " · All day"}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-ink-3">
                <Users size={13} aria-hidden />
                {e._count.rsvps} going
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarDays size={20} />}
            title="Nothing scheduled"
            description="Add the Board's meetings and deadlines so members can plan around them."
            action={
              <ButtonLink href="/admin/events/new" size="sm">
                Schedule an event
              </ButtonLink>
            }
          />
        </Card>
      )}

      {past.length > 0 ? (
        <>
          <h2 className="mb-3 mt-8 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
            Past events
          </h2>
          <Card className="divide-y divide-line">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/admin/events/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <span className="w-20 shrink-0 text-[12.5px] text-ink-3 tabular-nums">
                  {formatDate(e.startsAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {e.title}
                </span>
                <Badge tone={e._count.rsvps > 0 ? "ok" : "neutral"}>
                  {e._count.rsvps} attended
                </Badge>
              </Link>
            ))}
          </Card>
        </>
      ) : null}
    </div>
  );
}
