"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  FolderOpen,
  CalendarDays,
  Users,
  UserCircle,
  Menu,
  X,
  LogOut,
  Globe,
  CheckSquare,
} from "lucide-react";
import type { Role } from "@prisma/client";

import { site } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Avatar, BoardMark } from "@/components/ui";
import { ViewSwitcher } from "@/components/view-switcher";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  badge?: number;
};

export function PortalShell({
  user,
  unreadCount,
  openTaskCount,
  children,
}: {
  user: {
    name: string;
    email: string;
    role: Role;
    position?: string | null;
    avatarUrl?: string | null;
  };
  unreadCount: number;
  openTaskCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setOpen(false), [pathname]);

  const nav: NavItem[] = [
    { href: "/portal", label: "Dashboard", Icon: LayoutDashboard },
    {
      href: "/portal/announcements",
      label: "Announcements",
      Icon: Megaphone,
      badge: unreadCount,
    },
    { href: "/portal/documents", label: "Documents", Icon: FolderOpen },
    { href: "/portal/events", label: "Events", Icon: CalendarDays },
    {
      href: "/portal/tasks",
      label: "My tasks",
      Icon: CheckSquare,
      badge: openTaskCount,
    },
    { href: "/portal/directory", label: "Directory", Icon: Users },
    { href: "/portal/profile", label: "My profile", Icon: UserCircle },
  ];

  // `/portal` would otherwise match every child route.
  const isActive = (href: string) =>
    href === "/portal"
      ? pathname === "/portal"
      : pathname === href || pathname.startsWith(`${href}/`);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <BoardMark size={32} />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-serif text-[15px] font-semibold">
            {site.shortName}
          </p>
          <p className="truncate text-[11px] text-ink-3">Members&apos; portal</p>
        </div>
      </div>

      <ViewSwitcher role={user.role} current="portal" />

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Portal">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, Icon, badge }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors",
                  isActive(href)
                    ? "bg-brand-soft font-medium text-brand"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <Icon size={17} aria-hidden />
                <span className="flex-1 truncate">{label}</span>
                {badge && badge > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white tabular-nums">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Link
          href="/portal/profile"
          className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-2"
        >
          <Avatar name={user.name} src={user.avatarUrl} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13.5px] font-medium">{user.name}</p>
            <p className="truncate text-[11.5px] text-ink-3">
              {user.position ?? user.email}
            </p>
          </div>
        </Link>

        <div className="mt-1 flex gap-1">
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <Globe size={14} aria-hidden />
            Website
          </Link>
          <form action="/api/signout" method="post" className="flex-1">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] text-ink-3 hover:bg-surface-2 hover:text-danger"
            >
              <LogOut size={14} aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-screen">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-ml-1 grid h-11 w-11 place-items-center rounded-md text-ink-2 hover:bg-surface-2"
        >
          <Menu size={20} />
        </button>
        <span className="font-serif text-[15px] font-semibold">
          {site.shortName}
        </span>
        {unreadCount > 0 ? (
          <Link
            href="/portal/announcements"
            aria-label={`${unreadCount} unread announcements`}
            className="-mr-2 ml-auto grid h-11 w-11 place-items-center"
          >
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3.5 grid h-9 w-9 place-items-center rounded-md text-ink-2 hover:bg-surface-2"
            >
              <X size={19} />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <main id="main" className="min-w-0 flex-1 bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
