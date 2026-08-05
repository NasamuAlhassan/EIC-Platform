"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Users,
  Megaphone,
  FileText,
  CalendarDays,
  BookOpen,
  Newspaper,
  Images,
  Inbox,
  Award,
  ScrollText,
  CheckSquare,
  MessageSquareWarning,
} from "lucide-react";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { can } from "@/lib/rbac";
import { ViewSwitcher } from "@/components/view-switcher";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  show: (r: Role) => boolean;
  badge?: number;
};

export function AdminShell({
  role,
  newSubmissions,
  children,
}: {
  role: Role;
  newSubmissions: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const groups: { heading: string; items: Item[] }[] = [
    {
      heading: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", Icon: Gauge, show: can.accessAdmin },
        {
          href: "/admin/submissions",
          label: "Inbox",
          Icon: Inbox,
          show: can.viewSubmissions,
          badge: newSubmissions,
        },
      ],
    },
    {
      heading: "Operations",
      items: [
        {
          href: "/admin/announcements",
          label: "Announcements",
          Icon: Megaphone,
          show: can.manageAnnouncements,
        },
        {
          href: "/admin/events",
          label: "Events",
          Icon: CalendarDays,
          show: can.manageEvents,
        },
        {
          href: "/admin/tasks",
          label: "Tasks",
          Icon: CheckSquare,
          show: can.assignTasks,
        },
        {
          href: "/admin/broadcast",
          label: "Urgent SMS",
          Icon: MessageSquareWarning,
          show: can.sendGroupMessages,
        },
      ],
    },
    {
      heading: "Content",
      items: [
        {
          href: "/admin/documents",
          label: "Documents",
          Icon: FileText,
          show: can.uploadDocuments,
        },
        {
          href: "/admin/publications",
          label: "Publications",
          Icon: BookOpen,
          show: can.managePublications,
        },
        {
          href: "/admin/posts",
          label: "News posts",
          Icon: Newspaper,
          show: can.managePosts,
        },
        {
          href: "/admin/media",
          label: "Media & albums",
          Icon: Images,
          show: can.uploadMedia,
        },
        {
          href: "/admin/achievements",
          label: "Achievements",
          Icon: Award,
          show: can.managePosts,
        },
      ],
    },
    {
      heading: "Administration",
      items: [
        {
          href: "/admin/members",
          label: "Members",
          Icon: Users,
          show: can.manageMembers,
        },
        {
          href: "/admin/audit",
          label: "Activity log",
          Icon: ScrollText,
          show: can.viewAuditLog,
        },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="glass shrink-0 border-b border-line lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-line pb-3">
          <ViewSwitcher role={role} current="admin" />
        </div>

        <nav
          className="flex gap-4 overflow-x-auto p-3 lg:block lg:overflow-visible"
          aria-label="Admin"
        >
          {groups.map((group) => {
            const items = group.items.filter((i) => i.show(role));
            if (items.length === 0) return null;

            return (
              <div key={group.heading} className="shrink-0 lg:mb-5">
                <p className="mb-1.5 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3 lg:block">
                  {group.heading}
                </p>
                <ul className="flex gap-1 lg:block lg:space-y-0.5">
                  {items.map(({ href, label, Icon, badge }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] transition-colors",
                          isActive(href)
                            ? "bg-brand-soft font-medium text-brand"
                            : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        <Icon size={16} aria-hidden />
                        <span className="flex-1">{label}</span>
                        {badge && badge > 0 ? (
                          <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1.5 text-[10.5px] font-semibold text-white tabular-nums">
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <main id="main" className="min-w-0 flex-1 bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
