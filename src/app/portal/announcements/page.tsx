import type { Metadata } from "next";
import { Megaphone, Pin } from "lucide-react";

import { db } from "@/lib/db";
import { getPortalUser, announcementVisibility } from "@/lib/portal";
import { can, ROLE_LABEL } from "@/lib/rbac";
import { formatFullDate, timeAgo } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const user = await getPortalUser();

  const [announcements, readRows] = await Promise.all([
    db.announcement.findMany({
      where: announcementVisibility(user.role),
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 60,
      include: { author: { select: { name: true, position: true } } },
    }),
    db.announcementRead.findMany({
      where: { userId: user.id },
      select: { announcementId: true },
    }),
  ]);

  const readSet = new Set(readRows.map((r) => r.announcementId));
  const unreadIds = announcements
    .filter((a) => !readSet.has(a.id))
    .map((a) => a.id);

  return (
    <div>
      <MarkRead ids={unreadIds} />

      <PageHeader
        title="Announcements"
        description="Notices from the executive committee. Anything addressed to your role appears here."
        action={
          can.manageAnnouncements(user.role) ? (
            <ButtonLink href="/admin/announcements/new" size="sm">
              New announcement
            </ButtonLink>
          ) : null
        }
      />

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => {
            const unread = !readSet.has(a.id);
            return (
              <Card
                key={a.id}
                id={a.id}
                className={`scroll-mt-24 p-5 ${
                  unread ? "border-l-[3px] border-l-accent" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {a.pinned ? (
                    <Badge tone="brand">
                      <Pin size={10} aria-hidden />
                      Pinned
                    </Badge>
                  ) : null}
                  {a.priority === "URGENT" ? (
                    <Badge tone="danger">Urgent</Badge>
                  ) : a.priority === "IMPORTANT" ? (
                    <Badge tone="warn">Important</Badge>
                  ) : null}
                  {a.audienceRoles.length > 0 ? (
                    <Badge tone="neutral">
                      {a.audienceRoles.map((r) => ROLE_LABEL[r]).join(", ")} only
                    </Badge>
                  ) : null}
                  {unread ? <Badge tone="accent">New</Badge> : null}
                </div>

                <h2 className="mt-2.5 font-serif text-[21px] leading-snug">
                  {a.title}
                </h2>

                <p className="mt-1 text-[12.5px] text-ink-3">
                  {a.author?.name ?? "The Board"}
                  {a.author?.position ? ` · ${a.author.position}` : ""} ·{" "}
                  <time dateTime={a.publishedAt.toISOString()}>
                    {formatFullDate(a.publishedAt)}
                  </time>{" "}
                  ({timeAgo(a.publishedAt)})
                </p>

                <div className="prose-editorial mt-4 text-[15px]">
                  {a.body.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {a.expiresAt ? (
                  <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-3">
                    This notice is shown until {formatFullDate(a.expiresAt)}.
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Megaphone size={20} />}
            title="No announcements"
            description="When an executive posts a notice, it will appear here and you'll see a badge in the sidebar."
          />
        </Card>
      )}
    </div>
  );
}
