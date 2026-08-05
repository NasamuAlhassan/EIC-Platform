import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { db } from "@/lib/db";
import { site, about } from "@/lib/config";
import { ButtonLink } from "@/components/ui";
import { initials } from "@/lib/utils";
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
            /*
              Portraits large enough to actually be portraits. The old layout
              put people at 52px beside their own titles, which reads as a
              footnote — the wrong register for the page that introduces the
              Board to the school.

              Each sits in the arch, the same frame the current issue gets. It
              is the shape from the crest, and using it for the people as well
              as the publications says they belong to the same institution.
            */
            <ul className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-3 lg:gap-x-8">
              {executives.map((e) => (
                <li key={e.id}>
                  <div className="arch overflow-hidden border border-ink bg-surface-2">
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.avatarUrl}
                        alt=""
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover"
                      />
                    ) : (
                      /*
                        Most members will not have uploaded a photograph yet.
                        An empty frame with their initials set properly is a
                        placeholder; a broken image icon is an apology.
                      */
                      <div className="grid aspect-[3/4] w-full place-items-center">
                        <span
                          aria-hidden
                          className="font-serif text-[42px] leading-none text-ink-3 sm:text-[48px]"
                        >
                          {initials(e.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="mt-3.5 font-serif text-[18px] leading-snug sm:text-[20px]">
                    {e.name}
                  </h3>
                  {e.position ? (
                    <p className="label label-accent mt-1.5">{e.position}</p>
                  ) : null}
                  {e.classYear ? (
                    <p className="label mt-1">{e.classYear}</p>
                  ) : null}
                  {e.bio ? (
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                      {e.bio}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="border border-dashed border-line-2 px-4 py-10 text-center text-sm text-ink-3">
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
