import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock, ClipboardList, Lock } from "lucide-react";

import { db } from "@/lib/db";
import { formatFullDate, formatTime } from "@/lib/utils";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { EVENT_LABEL } from "@/components/public-cards";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event || !event.isPublic) return { title: "Not found" };

  return {
    title: event.title,
    description:
      event.description ?? `${EVENT_LABEL[event.type]} — ${event.title}`,
  };
}

export default async function PublicEventPage({ params }: Props) {
  const { id } = await params;

  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { rsvps: true } } },
  });

  if (!event || !event.isPublic) notFound();

  const isPast = event.startsAt < new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/events"
        className="no-print inline-flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-brand"
      >
        <ArrowLeft size={15} aria-hidden />
        All events
      </Link>

      <article className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{EVENT_LABEL[event.type]}</Badge>
          {isPast ? <Badge tone="neutral">Past event</Badge> : null}
        </div>

        <h1 className="mt-3 font-serif text-[34px] leading-tight tracking-tight sm:text-[40px]">
          {event.title}
        </h1>

        <Card className="mt-6 divide-y divide-line">
          <div className="flex items-start gap-3 p-4">
            <Clock size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                <time dateTime={event.startsAt.toISOString()}>
                  {formatFullDate(event.startsAt)}
                </time>
              </p>
              <p className="text-[13.5px] text-ink-3">
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
              <MapPin
                size={17}
                className="mt-0.5 shrink-0 text-ink-3"
                aria-hidden
              />
              <div>
                <p className="font-medium text-ink">{event.location}</p>
                <p className="text-[13.5px] text-ink-3">Location</p>
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
                <p className="font-medium text-ink">Bring with you</p>
                <p className="text-[13.5px] text-ink-2">
                  {event.requiredMaterials}
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        {event.description ? (
          <div className="prose-editorial mt-8">
            {event.description.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        ) : null}

        {event.agenda ? (
          <section className="mt-9">
            <h2 className="section-marker font-serif text-[22px]">
            <span className="shrink-0">Agenda</span>
          </h2>
            <div className="prose-editorial mt-5">
              {event.agenda.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        {!isPast && event.rsvpEnabled ? (
          <Card className="mt-9 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Lock size={17} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
              <div>
                <p className="font-medium text-ink">
                  Members: let us know if you&apos;re coming
                </p>
                <p className="text-[13.5px] text-ink-3">
                  RSVP from the members&apos; portal.
                  {event._count.rsvps > 0
                    ? ` ${event._count.rsvps} ${
                        event._count.rsvps === 1 ? "person has" : "people have"
                      } responded.`
                    : ""}
                </p>
              </div>
            </div>
            <ButtonLink href={`/portal/events/${event.id}`} size="sm">
              Open in portal
            </ButtonLink>
          </Card>
        ) : null}
      </article>
    </div>
  );
}
