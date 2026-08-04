import Link from "next/link";
import {
  CalendarDays,
  Megaphone,
  CheckSquare,
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { db } from "@/lib/db";
import { getPortalUser, announcementVisibility } from "@/lib/portal";
import { ROLE_LABEL, visibleMinRoles } from "@/lib/rbac";
import {
  formatDate,
  formatTime,
  relativeDay,
  timeAgo,
  truncate,
  toPlainText,
} from "@/lib/utils";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  ButtonLink,
  EmptyState,
} from "@/components/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  const user = await getPortalUser();
  const now = new Date();

  const [announcements, events, tasks, myRsvps, recentDocs, readIds] =
    await Promise.all([
      db.announcement.findMany({
        where: announcementVisibility(user.role),
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 4,
        include: { author: { select: { name: true } } },
      }),
      db.event.findMany({
        where: {
          startsAt: { gte: now },
          minRole: { in: visibleMinRoles(user.role) },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      db.task.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" } },
        orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
        take: 5,
      }),
      db.rsvp.findMany({
        where: { userId: user.id, event: { startsAt: { gte: now } } },
        select: { eventId: true, status: true },
      }),
      db.document.findMany({
        where: { minRole: { in: visibleMinRoles(user.role) } },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { uploadedBy: { select: { name: true } } },
      }),
      db.announcementRead.findMany({
        where: { userId: user.id },
        select: { announcementId: true },
      }),
    ]);

  const readSet = new Set(readIds.map((r) => r.announcementId));
  const rsvpMap = new Map(myRsvps.map((r) => [r.eventId, r.status]));

  // Anything due in the next week is worth surfacing at the top.
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueSoon = tasks.filter((t) => t.dueAt && t.dueAt <= weekOut);
  const overdue = tasks.filter((t) => t.dueAt && t.dueAt < now);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {denied ? (
        <Alert tone="warn" title="You don't have access to that page">
          Your role ({ROLE_LABEL[user.role]}) doesn&apos;t include that area. If
          you think it should, ask an administrator.
        </Alert>
      ) : null}

      <header>
        <p className="text-[13px] text-ink-3">
          {greeting}, {user.name.split(" ")[0]}
        </p>
        <h1 className="mt-0.5 font-serif text-[30px] tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-2">
          {user.position ? `${user.position} · ` : ""}
          {ROLE_LABEL[user.role]}
        </p>
      </header>

      {overdue.length > 0 ? (
        <Alert tone="danger" title={`${overdue.length} overdue ${overdue.length === 1 ? "task" : "tasks"}`}>
          <ul className="mt-1 space-y-0.5">
            {overdue.map((t) => (
              <li key={t.id}>
                {t.title} — was due {formatDate(t.dueAt!)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------- Upcoming events */}
        <Card>
          <CardHeader
            title="Meetings & deadlines"
            description="The next five on your calendar"
            action={
              <Link
                href="/portal/events"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                All
                <ArrowRight size={13} aria-hidden />
              </Link>
            }
          />
          {events.length > 0 ? (
            <ul className="divide-y divide-line">
              {events.map((e) => {
                const rsvp = rsvpMap.get(e.id);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/portal/events/${e.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-2"
                    >
                      <div
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-line bg-surface-2 leading-none"
                      >
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-accent">
                          {e.startsAt.toLocaleString("en", { month: "short" })}
                        </span>
                        <span className="font-serif text-[17px] font-semibold tabular-nums">
                          {e.startsAt.getDate()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-medium">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-3">
                          {relativeDay(e.startsAt)}
                          {!e.allDay ? ` · ${formatTime(e.startsAt)}` : ""}
                          {e.location ? ` · ${e.location}` : ""}
                        </p>
                      </div>

                      {e.rsvpEnabled ? (
                        rsvp === "ATTENDING" ? (
                          <Badge tone="ok">Going</Badge>
                        ) : rsvp === "NOT_ATTENDING" ? (
                          <Badge tone="neutral">Not going</Badge>
                        ) : rsvp === "MAYBE" ? (
                          <Badge tone="warn">Maybe</Badge>
                        ) : (
                          <Badge tone="accent">RSVP</Badge>
                        )
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<CalendarDays size={19} />}
              title="Nothing scheduled"
              description="When an executive adds a meeting or deadline, it'll show up here."
            />
          )}
        </Card>

        {/* -------------------------------------------------------- My tasks */}
        <Card>
          <CardHeader
            title="Assigned to me"
            description={
              dueSoon.length > 0
                ? `${dueSoon.length} due within a week`
                : "Your open assignments"
            }
            action={
              <Link
                href="/portal/tasks"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
              >
                All
                <ArrowRight size={13} aria-hidden />
              </Link>
            }
          />
          {tasks.length > 0 ? (
            <ul className="divide-y divide-line">
              {tasks.map((t) => {
                const isOverdue = t.dueAt && t.dueAt < now;
                return (
                  <li key={t.id} className="flex items-start gap-3 px-5 py-3.5">
                    <CheckSquare
                      size={17}
                      className="mt-0.5 shrink-0 text-ink-3"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-medium">{t.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        {t.dueAt ? (
                          <>
                            {isOverdue ? (
                              <AlertTriangle
                                size={12}
                                className="text-danger"
                                aria-hidden
                              />
                            ) : (
                              <Clock size={12} aria-hidden />
                            )}
                            <span className={isOverdue ? "text-danger" : ""}>
                              Due {formatDate(t.dueAt)}
                            </span>
                          </>
                        ) : (
                          "No due date"
                        )}
                      </p>
                    </div>
                    {t.priority === "HIGH" ? (
                      <Badge tone="danger">High</Badge>
                    ) : t.status === "IN_PROGRESS" ? (
                      <Badge tone="brand">In progress</Badge>
                    ) : t.status === "BLOCKED" ? (
                      <Badge tone="warn">Blocked</Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<CheckSquare size={19} />}
              title="Nothing assigned"
              description="You're all clear. Assignments from executives appear here."
            />
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------ Announcements */}
      <Card>
        <CardHeader
          title="Recent announcements"
          action={
            <Link
              href="/portal/announcements"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
            >
              All
              <ArrowRight size={13} aria-hidden />
            </Link>
          }
        />
        {announcements.length > 0 ? (
          <ul className="divide-y divide-line">
            {announcements.map((a) => {
              const unread = !readSet.has(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={`/portal/announcements#${a.id}`}
                    className="block px-5 py-4 hover:bg-surface-2"
                  >
                    <div className="flex items-start gap-2.5">
                      {unread ? (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                        />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-[14.5px] ${unread ? "font-semibold" : "font-medium"}`}
                          >
                            {a.title}
                          </p>
                          {a.pinned ? <Badge tone="brand">Pinned</Badge> : null}
                          {a.priority === "URGENT" ? (
                            <Badge tone="danger">Urgent</Badge>
                          ) : a.priority === "IMPORTANT" ? (
                            <Badge tone="warn">Important</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                          {truncate(toPlainText(a.body), 150)}
                        </p>
                        <p className="mt-1.5 text-[12px] text-ink-3">
                          {a.author?.name ?? "The Board"} ·{" "}
                          {timeAgo(a.publishedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Megaphone size={19} />}
            title="No announcements yet"
            description="Notices from the executive committee land here."
          />
        )}
      </Card>

      {/* --------------------------------------------------- Recent documents */}
      <Card>
        <CardHeader
          title="Recently added to the library"
          action={
            <Link
              href="/portal/documents"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
            >
              Library
              <ArrowRight size={13} aria-hidden />
            </Link>
          }
        />
        {recentDocs.length > 0 ? (
          <ul className="divide-y divide-line">
            {recentDocs.map((d) => (
              <li key={d.id}>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2"
                >
                  <FolderOpen size={17} className="shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{d.title}</p>
                    <p className="text-[12px] text-ink-3">
                      {d.uploadedBy?.name ?? "Unknown"} · {timeAgo(d.createdAt)}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FolderOpen size={19} />}
            title="The library is empty"
            description="Minutes, reports, and templates will appear here once uploaded."
            action={<ButtonLink href="/portal/documents" size="sm" variant="secondary">Open the library</ButtonLink>}
          />
        )}
      </Card>
    </div>
  );
}
