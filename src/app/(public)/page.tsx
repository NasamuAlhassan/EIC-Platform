import Link from "next/link";
import { ArrowRight, BookOpen, Users, CalendarDays, Award } from "lucide-react";

import { db } from "@/lib/db";
import { site, about } from "@/lib/config";
import { ButtonLink } from "@/components/ui";
import {
  PublicationCard,
  PostCard,
  EventCard,
  SectionHeading,
} from "@/components/public-cards";

// Statically rendered and refreshed every 5 minutes. The public site is
// read-mostly, and this keeps it fast on a weak connection.
export const revalidate = 300;

export default async function HomePage() {
  const now = new Date();

  const [featured, publications, posts, events, memberCount, achievementCount] =
    await Promise.all([
      db.publication.findFirst({
        where: { isPublic: true, featured: true },
        orderBy: { publishedAt: "desc" },
      }),
      db.publication.findMany({
        where: { isPublic: true },
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
      db.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: now } },
        orderBy: { publishedAt: "desc" },
        take: 3,
        include: { author: { select: { name: true } } },
      }),
      db.event.findMany({
        where: { isPublic: true, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.user.count({ where: { status: "ACTIVE" } }),
      db.achievement.count(),
    ]);

  // Fall back to the newest publication when nothing is explicitly featured.
  const lead = featured ?? publications[0] ?? null;
  const rest = publications.filter((p) => p.id !== lead?.id).slice(0, 3);

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="hero-tint border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-medium text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                {site.schoolName}
                {site.foundedYear ? ` · Est. ${site.foundedYear}` : ""}
              </p>

              <h1 className="mt-5 font-serif text-[38px] leading-[1.08] tracking-tight sm:text-[52px]">
                {site.boardName}
              </h1>

              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
                {about.mission}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/publications" size="lg">
                  <BookOpen size={17} aria-hidden />
                  Read our publications
                </ButtonLink>
                <ButtonLink href="/contact#join" variant="secondary" size="lg">
                  Join the Board
                  <ArrowRight size={16} aria-hidden />
                </ButtonLink>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  { label: "Members", value: memberCount, Icon: Users },
                  {
                    label: "Publications",
                    value: publications.length ? `${publications.length}+` : "0",
                    Icon: BookOpen,
                  },
                  { label: "Achievements", value: achievementCount, Icon: Award },
                ].map(({ label, value, Icon }) => (
                  <div key={label}>
                    <dt className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-ink-3">
                      <Icon size={13} aria-hidden />
                      {label}
                    </dt>
                    <dd className="mt-1 font-serif text-[26px] font-semibold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Lead publication, presented as a cover on a shelf. */}
            {lead ? (
              <div className="relative mx-auto w-full max-w-[320px] lg:max-w-none">
                <div className="absolute -inset-4 -z-10 rounded-2xl bg-brand-soft/60 blur-2xl" aria-hidden />
                <Link
                  href={`/publications/${lead.slug}`}
                  className="group block overflow-hidden rounded-xl border border-line bg-surface shadow-pop transition-transform hover:-translate-y-1"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-surface-2">
                    {lead.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lead.coverImageUrl}
                        alt={`Cover of ${lead.title}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-brand p-8 text-center text-brand-ink">
                        <div>
                          <BookOpen size={32} className="mx-auto opacity-80" aria-hidden />
                          <p className="mt-4 font-serif text-2xl leading-tight">
                            {lead.title}
                          </p>
                          {lead.issueLabel ? (
                            <p className="mt-2 text-[13px] opacity-80">
                              {lead.issueLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[11.5px] uppercase tracking-wider text-ink-3">
                        Latest issue
                      </p>
                      <p className="truncate font-serif text-[15px]">
                        {lead.title}
                      </p>
                    </div>
                    <ArrowRight
                      size={17}
                      className="shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- What we do */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {about.what.map((item) => (
            <div key={item.title}>
              <h2 className="rule-accent font-serif text-[20px]">{item.title}</h2>
              <p className="mt-3.5 text-[14.5px] leading-relaxed text-ink-2">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Publications */}
      {rest.length > 0 ? (
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <SectionHeading
              title="Recent publications"
              description="Every issue the Board has put out, free to read and download."
              action={
                <ButtonLink href="/publications" variant="secondary" size="sm">
                  View archive
                  <ArrowRight size={15} aria-hidden />
                </ButtonLink>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <PublicationCard key={p.id} publication={p} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- News and events */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <SectionHeading
              title="News & announcements"
              action={
                <ButtonLink href="/news" variant="ghost" size="sm">
                  All news
                  <ArrowRight size={15} aria-hidden />
                </ButtonLink>
              }
            />
            {posts.length > 0 ? (
              <div>
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} authorName={p.author?.name} />
                ))}
              </div>
            ) : (
              <p className="rounded-[var(--radius)] border border-dashed border-line-2 px-4 py-8 text-center text-sm text-ink-3">
                No news posted yet.
              </p>
            )}
          </div>

          <div>
            <SectionHeading
              title="What's coming up"
              action={
                <ButtonLink href="/events" variant="ghost" size="sm">
                  Calendar
                  <ArrowRight size={15} aria-hidden />
                </ButtonLink>
              }
            />
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <div className="rounded-[var(--radius)] border border-dashed border-line-2 px-4 py-8 text-center">
                <CalendarDays
                  size={20}
                  className="mx-auto text-ink-3"
                  aria-hidden
                />
                <p className="mt-2 text-sm text-ink-3">
                  Nothing on the public calendar yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Join us */}
      <section className="border-t border-line bg-brand text-brand-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl font-serif text-[30px] leading-tight sm:text-[36px]">
            Want to write, edit, shoot, or design with us?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed opacity-85">
            The Board takes on new members every term. No experience needed —
            just tell us what you&apos;d like to work on.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink
              href="/contact#join"
              size="lg"
              className="bg-brand-ink text-brand hover:opacity-90"
            >
              Apply to join
              <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="/about"
              size="lg"
              variant="ghost"
              className="border border-current/25 text-brand-ink hover:bg-white/10 hover:text-brand-ink"
            >
              Meet the Board
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
