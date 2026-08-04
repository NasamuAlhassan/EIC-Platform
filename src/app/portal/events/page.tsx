import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, Globe } from "lucide-react";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { can, visibleMinRoles } from "@/lib/rbac";
import { formatTime, relativeDay } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { EVENT_LABEL } from "@/components/public-cards";
import { RsvpButtons } from "./rsvp-buttons";

export const metadata: Metadata = { title: "Events" };

export default async function PortalEventsPage() {
  const user = await getPortalUser();
  const now = new Date();
  const visibleRoles = visibleMinRoles(user.role);

  const [upcoming, past, myRsvps] = await Promise.all([
    db.event.findMany({
      where: { startsAt: { gte: now }, minRole: { in: visibleRoles } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { rsvps: true } } },
    }),
    db.event.findMany({
      where: { startsAt: { lt: now }, minRole: { in: visibleRoles } },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
    db.rsvp.findMany({
      where: { userId: user.id },
      select: { eventId: true, status: true },
    }),
  ]);

  const rsvpMap = new Map(myRsvps.map((r) => [r.eventId, r.status]));

  const byMonth = upcoming.reduce<Record<string, typeof upcoming>>((acc, e) => {
    const key = e.startsAt.toLocaleString("en", {
      month: "long",
      year: "numeric",
    });
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const unanswered = upcoming.filter(
    (e) => e.rsvpEnabled && !rsvpMap.has(e.id),
  ).length;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={
          unanswered > 0
            ? `${unanswered} ${unanswered === 1 ? "event needs" : "events need"} your RSVP.`
            : "Meetings, deadlines, training, and publication dates."
        }
        action={
          can.manageEvents(user.role) ? (
            <ButtonLink href="/admin/events/new" size="sm">
              <Plus size={15} aria-hidden />
              New event
            </ButtonLink>
          ) : null
        }
      />

      {upcoming.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(byMonth).map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                {month}
              </h2>
              <div className="space-y-3">
                {list.map((e) => {
                  const current = rsvpMap.get(e.id) ?? null;
                  return (
                    <Card key={e.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          aria-hidden
                          className="grid h-13 w-13 shrink-0 place-items-center rounded-md border border-line bg-surface-2 p-2 leading-none"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                            {e.startsAt.toLocaleString("en", { month: "short" })}
                          </span>
                          <span className="font-serif text-[20px] font-semibold tabular-nums">
                            {e.startsAt.getDate()}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{EVENT_LABEL[e.type]}</Badge>
                            {e.isPublic ? (
                              <Badge tone="ok">
                                <Globe size={10} aria-hidden />
                                Public
                              </Badge>
                            ) : null}
                          </div>

                          <h3 className="mt-1.5 font-serif text-[18px] leading-snug">
                            <Link
                              href={`/portal/events/${e.id}`}
                              className="hover:text-brand"
                            >
                              {e.title}
                            </Link>
                          </h3>

                          <p className="mt-1 text-[13px] text-ink-3">
                            {relativeDay(e.startsAt)}
                            {!e.allDay ? ` · ${formatTime(e.startsAt)}` : " · All day"}
                            {e._count.rsvps > 0
                              ? ` · ${e._count.rsvps} responded`
                              : ""}
                          </p>

                          {e.location ? (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                              <MapPin size={13} aria-hidden />
                              {e.location}
                            </p>
                          ) : null}

                          {e.rsvpEnabled ? (
                            <div className="mt-3.5">
                              <RsvpButtons eventId={e.id} current={current} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarDays size={20} />}
            title="Nothing coming up"
            description="Meetings and deadlines added by executives appear here."
            action={
              can.manageEvents(user.role) ? (
                <ButtonLink href="/admin/events/new" size="sm">
                  Schedule an event
                </ButtonLink>
              ) : null
            }
          />
        </Card>
      )}

      {past.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
            Recently held
          </h2>
          <Card className="divide-y divide-line">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/portal/events/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <span className="w-20 shrink-0 text-[12.5px] text-ink-3 tabular-nums">
                  {e.startsAt.toLocaleDateString("en", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {e.title}
                </span>
                <Badge tone="neutral">{EVENT_LABEL[e.type]}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
