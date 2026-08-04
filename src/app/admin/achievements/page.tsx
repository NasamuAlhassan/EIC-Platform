import type { Metadata } from "next";
import { Award, Trash2 } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { AchievementForm } from "./achievement-form";
import { deleteAchievement } from "./actions";

export const metadata: Metadata = { title: "Achievements" };

export default async function AdminAchievementsPage() {
  await requireRole("EDITOR");

  const achievements = await db.achievement.findMany({
    orderBy: { achievedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Achievements"
        description="Awards and milestones, shown on the public achievements page."
      />

      <Card className="mb-6">
        <CardHeader title="Record an achievement" />
        <div className="p-5">
          <AchievementForm />
        </div>
      </Card>

      {achievements.length > 0 ? (
        <Card className="divide-y divide-line">
          {achievements.map((a) => (
            <div key={a.id} className="flex items-start gap-3.5 p-4">
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.imageUrl}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded border border-line object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-14 w-20 shrink-0 place-items-center rounded border border-line bg-surface-2 text-ink-3"
                >
                  <Award size={16} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-medium">{a.title}</h2>
                  {a.featured ? <Badge tone="accent">Highlighted</Badge> : null}
                </div>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {formatDate(a.achievedAt)}
                </p>
                {a.description ? (
                  <p className="mt-1.5 text-[13.5px] text-ink-2">
                    {a.description}
                  </p>
                ) : null}
              </div>

              <form action={deleteAchievement}>
                <input type="hidden" name="id" value={a.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${a.title}`}
                  className="text-ink-3 hover:text-danger"
                >
                  <Trash2 size={14} aria-hidden />
                </Button>
              </form>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<Award size={20} />}
            title="Nothing recorded yet"
            description="Awards and milestones you add here appear on the public site."
          />
        </Card>
      )}
    </div>
  );
}
