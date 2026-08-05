import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";

import { db } from "@/lib/db";
import { site, about } from "@/lib/config";
import { formatDate, formatTime, relativeDay, truncate } from "@/lib/utils";
import { ButtonLink } from "@/components/ui";

// Statically rendered and refreshed every 5 minutes. The public site is
// read-mostly, and this keeps it fast on a weak connection.
export const revalidate = 300;

export default async function HomePage() {
  const now = new Date();

  const [featured, publications, posts, events] = await Promise.all([
    db.publication.findFirst({
      where: { isPublic: true, featured: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.publication.findMany({
      where: { isPublic: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    db.post.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: now } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      include: { author: { select: { name: true } } },
    }),
    db.event.findMany({
      where: { isPublic: true, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
  ]);

  // Fall back to the newest publication when nothing is explicitly featured.
  const lead = featured ?? publications[0] ?? null;
  const backIssues = publications.filter((p) => p.id !== lead?.id).slice(0, 4);

  // The front page leads on the newest story, exactly as a paper does. The
  // Board decides what leads by publishing it, not by configuring anything.
  const [leadStory, ...moreStories] = posts;

  return (
    <>
      {/* ------------------------------------------------------------ Dateline */}
      <div className="dateline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
          <p className="label">
            {lead?.issueLabel ?? "The current issue"}
          </p>
          <p className="label">
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="label hidden sm:block">
            {site.fullName}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------- Front page */}
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
          <div className="min-w-0">
            {leadStory ? (
              <article>
                <p className="label label-accent">
                  {leadStory.publishedAt
                    ? formatDate(leadStory.publishedAt)
                    : "Latest"}
                </p>

                <h1 className="mt-3 font-serif text-[40px] leading-[1.05] tracking-[-0.022em] sm:text-[56px]">
                  <Link
                    href={`/news/${leadStory.slug}`}
                    className="hover:text-brand"
                  >
                    {leadStory.title}
                  </Link>
                </h1>

                {leadStory.excerpt ? (
                  <p className="standfirst measure-wide mt-5">
                    {leadStory.excerpt}
                  </p>
                ) : null}

                <p className="label mt-5 border-t border-line pt-3">
                  {leadStory.author?.name ?? "The Board"}
                </p>

                <Link
                  href={`/news/${leadStory.slug}`}
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand hover:underline"
                >
                  Read the story
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </article>
            ) : (
              /* Nothing published yet — say what the Board is, plainly. */
              <div>
                <h1 className="font-serif text-[40px] leading-[1.05] tracking-[-0.022em] sm:text-[54px]">
                  {site.boardName}
                </h1>
                <p className="standfirst measure-wide mt-5">{about.mission}</p>
                <ButtonLink
                  href="/publications"
                  size="lg"
                  className="mt-7 rounded-none"
                >
                  <BookOpen size={17} aria-hidden />
                  Read our publications
                </ButtonLink>
              </div>
            )}

            {moreStories.length > 0 ? (
              <div className="mt-10 grid gap-x-10 gap-y-6 border-t border-ink pt-6 sm:grid-cols-2">
                {moreStories.slice(0, 4).map((p) => (
                  <article key={p.id}>
                    <h2 className="font-serif text-[19px] leading-snug">
                      <Link href={`/news/${p.slug}`} className="hover:text-brand">
                        {p.title}
                      </Link>
                    </h2>
                    {p.excerpt ? (
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                        {truncate(p.excerpt, 110)}
                      </p>
                    ) : null}
                    <p className="label mt-2">
                      {p.publishedAt ? formatDate(p.publishedAt) : ""}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          {/* The lead publication, framed by the arch from the crest. */}
          {lead ? (
            <aside className="lg:border-l lg:border-line lg:pl-10">
              <h2 className="label section-marker mb-4">
                <span className="shrink-0">The current issue</span>
              </h2>

              <Link href={`/publications/${lead.slug}`} className="group block">
                <div className="arch overflow-hidden border border-ink bg-surface-2">
                  {lead.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lead.coverImageUrl}
                      alt={`Cover of ${lead.title}`}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[3/4] w-full place-items-center bg-brand px-6 pb-6 pt-16 text-center text-brand-ink">
                      <div>
                        <p className="font-serif text-[28px] leading-tight">
                          {lead.title}
                        </p>
                        {lead.issueLabel ? (
                          <p className="label mt-3 text-brand-ink/70">
                            {lead.issueLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="mt-4 font-serif text-[21px] leading-snug group-hover:text-brand">
                  {lead.title}
                </h3>
                <p className="label mt-1.5">
                  {lead.issueLabel ? `${lead.issueLabel} · ` : ""}
                  {formatDate(lead.publishedAt)}
                </p>
                {lead.description ? (
                  <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
                    {truncate(lead.description, 150)}
                  </p>
                ) : null}
                <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand group-hover:underline">
                  Read this issue
                  <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            </aside>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------ What we do */}
      <section className="border-t border-ink">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-3">
            {about.what.map((item) => (
              <div key={item.title} className="border-t border-line pt-4">
                <h2 className="font-serif text-[20px]">{item.title}</h2>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------- Back issues + calendar */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
            {backIssues.length > 0 ? (
              <div className="min-w-0">
                <h2 className="label section-marker mb-5">
                  <span className="shrink-0">From the archive</span>
                </h2>

                <ul>
                  {backIssues.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/publications/${p.slug}`}
                        className="group flex items-baseline gap-4 border-b border-line py-3"
                      >
                        <span className="label w-28 shrink-0">
                          {p.issueLabel ?? formatDate(p.publishedAt)}
                        </span>
                        <span className="min-w-0 flex-1 font-serif text-[17px] group-hover:text-brand">
                          {p.title}
                        </span>
                        <ArrowRight
                          size={14}
                          aria-hidden
                          className="shrink-0 text-ink-3 group-hover:text-brand"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/publications"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand hover:underline"
                >
                  The full archive
                  <ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            ) : (
              <div />
            )}

            <div className="lg:border-l lg:border-line lg:pl-10">
              <h2 className="label section-marker mb-5">
                <span className="shrink-0">What&apos;s coming up</span>
              </h2>

              {events.length > 0 ? (
                <ul>
                  {events.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="group flex gap-3.5 border-b border-line py-3.5"
                      >
                        <span
                          aria-hidden
                          className="grid h-12 w-12 shrink-0 place-items-center border border-ink leading-none"
                        >
                          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-accent">
                            {e.startsAt.toLocaleString("en", { month: "short" })}
                          </span>
                          <span className="font-serif text-[18px] font-semibold tabular-nums">
                            {e.startsAt.getDate()}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-[16px] leading-snug group-hover:text-brand">
                            {e.title}
                          </span>
                          <span className="label mt-1 block">
                            {relativeDay(e.startsAt)}
                            {!e.allDay ? ` · ${formatTime(e.startsAt)}` : ""}
                            {e.location ? ` · ${e.location}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 border-b border-line py-4 text-[13.5px] text-ink-3">
                  <CalendarDays size={15} aria-hidden />
                  Nothing on the public calendar yet.
                </p>
              )}

              <Link
                href="/events"
                className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-brand hover:underline"
              >
                The full calendar
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Join us */}
      <section className="border-t border-ink">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="font-serif text-[30px] leading-tight sm:text-[36px]">
            Every member of the Board started by writing one thing.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15.5px] leading-relaxed text-ink-2">
            We take on new members every term. No experience needed — tell us
            what you&apos;d like to work on and an editor will find you
            something.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact#join" size="lg" className="rounded-none">
              Apply to join
              <ArrowRight size={16} aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="secondary"
              size="lg"
              className="rounded-none"
            >
              Meet the Board
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
