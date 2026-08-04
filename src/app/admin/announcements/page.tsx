import type { Metadata } from "next";
import { Megaphone, Pin, Trash2, Mail, Plus, Eye } from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { ROLE_LABEL } from "@/lib/rbac";
import { formatDate, timeAgo, truncate, toPlainText } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { deleteAnnouncement, togglePinned } from "./actions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  await requireRole("EXECUTIVE");
  const { created } = await searchParams;

  const [announcements, memberCount] = await Promise.all([
    db.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 60,
      include: {
        author: { select: { name: true } },
        _count: { select: { reads: true } },
      },
    }),
    db.user.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Notices to the whole Board, or to specific roles."
        action={
          <ButtonLink href="/admin/announcements/new" size="sm">
            <Plus size={15} aria-hidden />
            New
          </ButtonLink>
        }
      />

      {created ? (
        <Alert tone="ok" className="mb-5">
          Announcement posted.
        </Alert>
      ) : null}

      {announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => {
            const readPercent =
              memberCount > 0
                ? Math.round((a._count.reads / memberCount) * 100)
                : 0;

            return (
              <Card key={a.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
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
                          {a.audienceRoles.map((r) => ROLE_LABEL[r]).join(", ")}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Everyone</Badge>
                      )}
                      {a.emailSentAt ? (
                        <Badge tone="ok">
                          <Mail size={10} aria-hidden />
                          Emailed
                        </Badge>
                      ) : null}
                    </div>

                    <h2 className="mt-2 text-[16px] font-medium">{a.title}</h2>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                      {truncate(toPlainText(a.body), 180)}
                    </p>

                    <p className="mt-2 text-[12.5px] text-ink-3">
                      {a.author?.name ?? "Unknown"} · {timeAgo(a.publishedAt)}
                      {a.expiresAt ? ` · expires ${formatDate(a.expiresAt)}` : ""}
                    </p>

                    {/* Read receipts — how many members actually saw it. */}
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div
                        className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-3"
                        role="img"
                        aria-label={`${readPercent}% of members have read this`}
                      >
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${readPercent}%` }}
                        />
                      </div>
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                        <Eye size={12} aria-hidden />
                        {a._count.reads} of {memberCount} read
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <form action={togglePinned}>
                      <input type="hidden" name="id" value={a.id} />
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        aria-label={a.pinned ? "Unpin" : "Pin to top"}
                      >
                        <Pin size={14} aria-hidden />
                        {a.pinned ? "Unpin" : "Pin"}
                      </Button>
                    </form>

                    <form action={deleteAnnouncement}>
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
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Megaphone size={20} />}
            title="No announcements yet"
            description="Post a notice and every member will see it when they next sign in."
            action={
              <ButtonLink href="/admin/announcements/new" size="sm">
                Write the first one
              </ButtonLink>
            }
          />
        </Card>
      )}
    </div>
  );
}
