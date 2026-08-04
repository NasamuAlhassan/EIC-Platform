import type { Metadata } from "next";
import { Award } from "lucide-react";

import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import { AchievementCard } from "@/components/public-cards";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Achievements",
  description: `Awards, milestones, and highlights from the ${site.boardName}.`,
};

export default async function AchievementsPage() {
  const achievements = await db.achievement.findMany({
    orderBy: { achievedAt: "desc" },
  });

  const featured = achievements.filter((a) => a.featured).slice(0, 3);
  const rest = achievements.filter((a) => !featured.includes(a));

  // Group the remainder by year — the closest thing to a timeline without
  // building one.
  const byYear = rest.reduce<Record<number, typeof rest>>((acc, a) => {
    const y = a.achievedAt.getFullYear();
    (acc[y] ??= []).push(a);
    return acc;
  }, {});
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <p className="text-[12px] font-medium uppercase tracking-wider text-accent">
          Highlights
        </p>
        <h1 className="mt-2.5 font-serif text-[36px] leading-tight tracking-tight sm:text-[42px]">
          Achievements
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Awards, milestones, and moments worth keeping a record of.
        </p>
      </header>

      {achievements.length === 0 ? (
        <EmptyState
          icon={<Award size={20} />}
          title="No achievements recorded yet"
          description="As the Board wins awards and hits milestones, they'll be listed here."
        />
      ) : (
        <>
          {featured.length > 0 ? (
            <div className="mb-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          ) : null}

          {years.length > 0 ? (
            <div className="space-y-10">
              {years.map((year) => (
                <section key={year}>
                  <h2 className="mb-4 font-serif text-[26px] text-ink-3">
                    {year}
                  </h2>
                  <ul className="border-t border-line">
                    {byYear[year].map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:gap-6"
                      >
                        <time
                          dateTime={a.achievedAt.toISOString()}
                          className="w-24 shrink-0 pt-0.5 text-[13px] text-ink-3 tabular-nums"
                        >
                          {formatDate(a.achievedAt)}
                        </time>
                        <div className="min-w-0">
                          <h3 className="font-serif text-[18px] leading-snug">
                            {a.title}
                          </h3>
                          {a.description ? (
                            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
                              {a.description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
