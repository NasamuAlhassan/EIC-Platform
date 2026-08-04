import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  ClipboardList,
  Users,
  Globe,
} from "lucide-react";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { can, visibleMinRoles } from "@/lib/rbac";
import { formatFullDate, formatTime } from "@/lib/utils";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
} from "@/components/ui";
import { EVENT_LABEL } from "@/components/public-cards";
import { RsvpButtons } from "../rsvp-buttons";

export const metadata: Metadata = { title: "Event" };

export default async function PortalEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getPortalUser();

  const event = await db.event.findFirst({
    where: { id, minRole: { in: visibleMinRoles(user.role) } },
    include: {
      createdBy: { select: { name: true, position: true } },
      rsvps: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, position: true } },
        },
        orderBy: { respondedAt: "asc" },
      },
    },
  });

  if (!event) notFound();

  const mine = event.rsvps.find((r) => r.user.id === user.id) ?? null;
  const isPast = event.startsAt < new Date();

  const attending = event.rsvps.filter((r) => r.status === "ATTENDING");
  const maybe = event.rsvps.filter((r) => r.status === "MAYBE");
  const declined = event.rsvps.filter((r) => r.status === "NOT_ATTENDING");

  // Only executives need to see who said what.
  const showAttendance = can.viewAttendance(user.role);

  return (
    <div>
      <Link
        href="/portal/events"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        Calendar
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{EVENT_LABEL[event.type]}</Badge>
        {event.isPublic ? (
          <Badge tone="ok">
            <Globe size={10} aria-hidden />
            On the public site
          </Badge>
        ) : null}
        {isPast ? <Badge tone="neutral">Past</Badge> : null}
      </div>

      <h1 className="mt-2.5 font-serif text-[30px] leading-tight tracking-tight">
        {event.title}
      </h1>

      {event.createdBy ? (
        <p className="mt-1.5 text-[13px] text-ink-3">
          Scheduled by {event.createdBy.name}
          {event.createdBy.position ? ` · ${event.createdBy.position}` : ""}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <Card className="divide-y divide-line">
            <div className="flex items-start gap-3 p-4">
              <Clock size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
              <div>
                <p className="font-medium">{formatFullDate(event.startsAt)}</p>
                <p className="text-[13px] text-ink-3">
                  {event.allDay
                    ? "All day"
                    : `${formatTime(event.startsAt)}${
                        event.endsAt ? ` – ${formatTime(event.endsAt)}` : ""
                      }`}
                </p>
              </div>
            </div>

            {event.location ? (
              <div className="flex items-start gap-3 p-4">
                <MapPin size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <div>
                  <p className="font-medium">{event.location}</p>
                  <p className="text-[13px] text-ink-3">Location</p>
                </div>
              </div>
            ) : null}

            {event.requiredMaterials ? (
              <div className="flex items-start gap-3 p-4">
                <ClipboardList
                  size={17}
                  className="mt-0.5 shrink-0 text-ink-3"
                  aria-hidden
                />
                <div>
                  <p className="font-medium">Bring with you</p>
                  <p className="text-[13px] text-ink-2">
                    {event.requiredMaterials}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          {event.description ? (
            <section>
              <h2 className="font-sans text-[15px] font-semibold">Details</h2>
              <div className="prose-editorial mt-2.5 text-[15px]">
                {event.description.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}

          {event.agenda ? (
            <section>
              <h2 className="font-sans text-[15px] font-semibold">Agenda</h2>
              <div className="prose-editorial mt-2.5 text-[15px]">
                {event.agenda.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          {event.rsvpEnabled && !isPast ? (
            <Card className="p-4">
              <h2 className="font-sans text-[14px] font-semibold">
                Are you coming?
              </h2>
              <div className="mt-3">
                <RsvpButtons eventId={event.id} current={mine?.status ?? null} />
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Who's coming"
              description={`${attending.length} going · ${maybe.length} maybe · ${declined.length} not`}
            />
            {showAttendance ? (
              <div className="max-h-96 overflow-y-auto p-4">
                {attending.length + maybe.length + declined.length === 0 ? (
                  <p className="text-[13px] text-ink-3">
                    Nobody has responded yet.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {[...attending, ...maybe, ...declined].map((r) => (
                      <li key={r.id} className="flex items-center gap-2.5">
                        <Avatar
                          name={r.user.name}
                          src={r.user.avatarUrl}
                          size={28}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13.5px]">
                          {r.user.name}
                        </span>
                        {r.status === "ATTENDING" ? (
                          <Badge tone="ok">Going</Badge>
                        ) : r.status === "MAYBE" ? (
                          <Badge tone="warn">Maybe</Badge>
                        ) : (
                          <Badge tone="neutral">No</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="p-4">
                <p className="flex items-start gap-2 text-[13px] text-ink-3">
                  <Users size={15} className="mt-0.5 shrink-0" aria-hidden />
                  {attending.length}{" "}
                  {attending.length === 1 ? "member is" : "members are"} going.
                  The full list is visible to executives.
                </p>
              </div>
            )}
          </Card>

          {can.manageEvents(user.role) ? (
            <ButtonLink
              href={`/admin/events/${event.id}`}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Edit this event
            </ButtonLink>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
