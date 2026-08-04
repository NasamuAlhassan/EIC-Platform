import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { db } from "@/lib/db";
import { site, about } from "@/lib/config";
import { Avatar, ButtonLink } from "@/components/ui";
import { SectionHeading } from "@/components/public-cards";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description: `Who we are, how ${site.boardName} is organised, and who currently leads it.`,
};

export default async function AboutPage() {
  const executives = await db.user.findMany({
    where: { isExecutive: true, status: "ACTIVE" },
    orderBy: [{ execOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      position: true,
      bio: true,
      avatarUrl: true,
      classYear: true,
    },
  });

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
            About us
          </p>
          <h1 className="mt-3 font-serif text-[36px] leading-tight tracking-tight sm:text-[44px]">
            {site.boardName}
          </h1>
          {/* People who don't already know the initials need the words. */}
          {site.fullName ? (
            <p className="mt-2 text-[17px] text-ink-3">{site.fullName}</p>
          ) : null}
          <p className="mt-1 text-[15px] text-ink-3">{site.schoolName}</p>
          <p className="mt-5 text-[18px] leading-relaxed text-ink-2">
            {about.mission}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Structure */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          title="How the Board is organised"
          description="Four groups, each with its own remit. Members move between them as they find the work they enjoy."
        />
        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line sm:grid-cols-2">
          {about.structure.map((s) => (
            <div key={s.name} className="bg-surface p-6">
              <h3 className="font-serif text-[19px]">{s.name}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- Executives */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            title="Current executives"
            description="The members responsible for running the Board this year."
          />

          {executives.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {executives.map((e) => (
                <li
                  key={e.id}
                  className="rounded-[var(--radius)] border border-line bg-paper p-5"
                >
                  <div className="flex items-center gap-3.5">
                    <Avatar name={e.name} src={e.avatarUrl} size={52} />
                    <div className="min-w-0">
                      <p className="truncate font-serif text-[17px]">{e.name}</p>
                      {e.position ? (
                        <p className="truncate text-[13px] font-medium text-brand">
                          {e.position}
                        </p>
                      ) : null}
                      {e.classYear ? (
                        <p className="truncate text-[12.5px] text-ink-3">
                          {e.classYear}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {e.bio ? (
                    <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-2">
                      {e.bio}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius)] border border-dashed border-line-2 px-4 py-10 text-center text-sm text-ink-3">
              Executives haven&apos;t been published yet. An administrator can
              mark members as executives in the admin area, and they&apos;ll
              appear here.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- Closing */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-serif text-[26px] leading-tight sm:text-[30px]">
          Every member starts as a writer.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed text-ink-2">
          If you can commit to a meeting a week and a deadline a term, there is
          a place for you on the Board.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/contact#join" size="lg">
            Apply to join
            <ArrowRight size={16} aria-hidden />
          </ButtonLink>
          <ButtonLink href="/publications" variant="secondary" size="lg">
            See our work
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
