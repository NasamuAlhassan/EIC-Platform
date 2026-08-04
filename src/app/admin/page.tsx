import Link from "next/link";
import {
  Users,
  CalendarDays,
  FileText,
  Inbox,
  Megaphone,
  BookOpen,
  HardDrive,
  Mail,
  ArrowRight,
  Plus,
  MessageSquareWarning,
} from "lucide-react";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { can } from "@/lib/rbac";
import { isEmailConfigured } from "@/lib/email";
import { isSmsConfigured } from "@/lib/sms";
import { isBlobConfigured, formatBytes } from "@/lib/storage";
import { formatTime, relativeDay } from "@/lib/utils";
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";

export default async function AdminDashboard() {
  const user = await requireRole("EDITOR");
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    memberCount,
    activeRecently,
    upcomingCount,
    docCount,
    docSize,
    publicationCount,
    newSubmissions,
    announcementCount,
    nextEvents,
    recentSubmissions,
    openTasks,
  ] = await Promise.all([
    db.user.count({ where: { status: "ACTIVE" } }),
    db.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
    db.event.count({ where: { startsAt: { gte: now } } }),
    db.document.count(),
    db.document.aggregate({ _sum: { fileSize: true } }),
    db.publication.count(),
    db.submission.count({ where: { status: "NEW" } }),
    db.announcement.count(),
    db.event.findMany({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        _count: { select: { rsvps: { where: { status: "ATTENDING" } } } },
      },
    }),
    can.viewSubmissions(user.role)
      ? db.submission.findMany({
          where: { status: "NEW" },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    db.task.count({ where: { status: { not: "DONE" } } }),
  ]);

  const mediaSize = await db.media.aggregate({ _sum: { fileSize: true } });
  const totalStorage =
    (docSize._sum.fileSize ?? 0) + (mediaSize._sum.fileSize ?? 0);

  // Surface configuration that will bite them the moment they deploy.
  const warnings: string[] = [];
  if (!isEmailConfigured()) {
    warnings.push(
      "Email isn't configured (RESEND_API_KEY is unset) — announcement emails and reminders are written to the server log instead of being sent.",
    );
  }
  if (!isBlobConfigured()) {
    warnings.push(
      "File storage isn't configured (BLOB_READ_WRITE_TOKEN is unset) — uploads are saved to local disk, which will not work once deployed to Vercel.",
    );
  }
  if (!isSmsConfigured()) {
    warnings.push(
      "No SMS provider is connected — urgent broadcasts are written to the server log instead of reaching anyone's phone.",
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Run the Board — members, announcements, events, and everything the site publishes."
      />

      {warnings.length > 0 ? (
        <Alert tone="warn" title="Before you go live" className="mb-6">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Members"
          value={memberCount}
          hint={`${activeRecently} active in 30 days`}
          icon={<Users size={17} />}
        />
        <Stat
          label="Upcoming"
          value={upcomingCount}
          hint={`${openTasks} open tasks`}
          icon={<CalendarDays size={17} />}
        />
        <Stat
          label="Documents"
          value={docCount}
          hint={`${announcementCount} announcements`}
          icon={<FileText size={17} />}
        />
        <Stat
          label="Storage used"
          value={formatBytes(totalStorage)}
          hint={`${publicationCount} publications`}
          icon={<HardDrive size={17} />}
        />
      </div>

      {/* Quick actions — the things executives do most often. */}
      <div className="mt-6 flex flex-wrap gap-2.5">
        {can.sendGroupMessages(user.role) ? (
          <ButtonLink href="/admin/broadcast" size="sm" variant="accent">
            <MessageSquareWarning size={15} aria-hidden />
            Urgent SMS
          </ButtonLink>
        ) : null}
        {can.manageAnnouncements(user.role) ? (
          <ButtonLink href="/admin/announcements/new" size="sm">
            <Plus size={15} aria-hidden />
            Announcement
          </ButtonLink>
        ) : null}
        {can.manageEvents(user.role) ? (
          <ButtonLink href="/admin/events/new" size="sm" variant="secondary">
            <Plus size={15} aria-hidden />
            Event
          </ButtonLink>
        ) : null}
        {can.uploadDocuments(user.role) ? (
          <ButtonLink href="/admin/documents/new" size="sm" variant="secondary">
            <Plus size={15} aria-hidden />
            Document
          </ButtonLink>
        ) : null}
        {can.managePublications(user.role) ? (
          <ButtonLink
            href="/admin/publications/new"
            size="sm"
            variant="secondary"
          >
            <Plus size={15} aria-hidden />
            Publication
          </ButtonLink>
        ) : null}
        {can.managePosts(user.role) ? (
          <ButtonLink href="/admin/posts/new" size="sm" variant="secondary">
            <Plus size={15} aria-hidden />
            News post
          </ButtonLink>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Next on the calendar"
            action={
              <Link
                href="/admin/events"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                Manage
                <ArrowRight size={13} aria-hidden />
              </Link>
            }
          />
          {nextEvents.length > 0 ? (
            <ul className="divide-y divide-line">
              {nextEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/events/${e.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">
                        {e.title}
                      </p>
                      <p className="text-[12.5px] text-ink-3">
                        {relativeDay(e.startsAt)}
                        {e.allDay ? " · All day" : ` · ${formatTime(e.startsAt)}`}
                      </p>
                    </div>
                    <Badge tone={e._count.rsvps > 0 ? "ok" : "neutral"}>
                      {e._count.rsvps} going
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarDays size={19} />}
              title="Nothing scheduled"
              action={
                can.manageEvents(user.role) ? (
                  <ButtonLink href="/admin/events/new" size="sm">
                    Add an event
                  </ButtonLink>
                ) : null
              }
            />
          )}
        </Card>

        {can.viewSubmissions(user.role) ? (
          <Card>
            <CardHeader
              title="Inbox"
              description={
                newSubmissions > 0
                  ? `${newSubmissions} unread`
                  : "Nothing new"
              }
              action={
                <Link
                  href="/admin/submissions"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                >
                  Open
                  <ArrowRight size={13} aria-hidden />
                </Link>
              }
            />
            {recentSubmissions.length > 0 ? (
              <ul className="divide-y divide-line">
                {recentSubmissions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/submissions#${s.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2"
                    >
                      <Mail
                        size={16}
                        className="mt-0.5 shrink-0 text-ink-3"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">
                          {s.name}
                        </p>
                        <p className="truncate text-[12.5px] text-ink-3">
                          {s.subject ?? s.message.slice(0, 60)}
                        </p>
                      </div>
                      <Badge tone={s.type === "JOIN" ? "accent" : "neutral"}>
                        {s.type === "JOIN" ? "Join" : "Message"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Inbox size={19} />}
                title="Inbox is clear"
                description="Messages and join applications from the website arrive here."
              />
            )}
          </Card>
        ) : (
          <Card>
            <CardHeader title="Your access" />
            <div className="p-5">
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                As an Editor you can publish news, upload documents and media,
                and manage publications. Events, announcements, and member
                management are handled by executives.
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/admin/publications",
            label: "Publications",
            Icon: BookOpen,
            show: can.managePublications(user.role),
          },
          {
            href: "/admin/announcements",
            label: "Announcements",
            Icon: Megaphone,
            show: can.manageAnnouncements(user.role),
          },
          {
            href: "/admin/members",
            label: "Members & roles",
            Icon: Users,
            show: can.manageMembers(user.role),
          },
        ]
          .filter((l) => l.show)
          .map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card hover:border-brand"
            >
              <Icon size={18} className="shrink-0 text-brand" aria-hidden />
              <span className="text-[14px] font-medium">{label}</span>
              <ArrowRight size={15} className="ml-auto text-ink-3" aria-hidden />
            </Link>
          ))}
      </div>
    </div>
  );
}
