import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { EmptyState } from "@/components/ui";
import { EventCard } from "@/components/public-cards";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Events",
  description: `Meetings, deadlines, training, and publication dates from the ${site.boardName}.`,
};

/** Group events under a "March 2025" style heading. */
function monthKey(d: Date) {
  return d.toLocaleString("en", { month: "long", year: "numeric" });
}

export default async function EventsPage() {
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { isPublic: true, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
    db.event.findMany({
      where: { isPublic: true, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  const grouped = upcoming.reduce<Record<string, typeof upcoming>>(
    (acc, e) => {
      const key = monthKey(e.startsAt);
      (acc[key] ??= []).push(e);
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-9">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          Calendar
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          Upcoming events
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
          Public meetings, deadlines, and dates from the Board&apos;s calendar.
          Members can see the full internal calendar in the portal.
        </p>
      </header>

      {upcoming.length > 0 ? (
        <div className="space-y-9">
          {Object.entries(grouped).map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-3 font-sans text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                {month}
              </h2>
              <div className="space-y-3">
                {list.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="Nothing scheduled publicly"
          description="When the Board publishes an event to the public calendar, it will appear here."
        />
      )}

      {past.length > 0 ? (
        <section className="mt-16 border-t border-line pt-9">
          <h2 className="rule-accent font-serif text-[24px]">Recently held</h2>
          <div className="mt-6 space-y-3 opacity-75">
            {past.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
