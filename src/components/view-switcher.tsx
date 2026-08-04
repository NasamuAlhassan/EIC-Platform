import Link from "next/link";
import { UserRound, Shield } from "lucide-react";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { can, ROLE_LABEL } from "@/lib/rbac";

/**
 * Switches between the member view and the admin view.
 *
 * The two areas are genuinely separate interfaces — different navigation,
 * different pages, different permissions — but they are reached with one
 * account. That is deliberate: a person's role is only knowable *after* they
 * authenticate, so separate sign-in pages would not separate anything. They
 * would just be two doors into the same lock, with people queueing at the wrong
 * one.
 *
 * What genuinely matters is that the two views don't bleed into each other, and
 * that someone who holds both can move between them on purpose rather than by
 * finding a stray link. Hence this control.
 *
 * Anyone without admin rights never sees it, and never sees the admin area
 * exists.
 */
export function ViewSwitcher({
  role,
  current,
}: {
  role: Role;
  current: "portal" | "admin";
}) {
  // Members and below have exactly one view, so there is nothing to switch.
  if (!can.accessAdmin(role)) return null;

  const options = [
    {
      key: "portal" as const,
      href: "/portal",
      label: "Member",
      Icon: UserRound,
      hint: "Announcements, documents, calendar",
    },
    {
      key: "admin" as const,
      href: "/admin",
      label: "Admin",
      Icon: Shield,
      hint: "Run the Board",
    },
  ];

  return (
    <div className="px-3 pt-3">
      <p className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        Signed in as {ROLE_LABEL[role]}
      </p>

      <div
        className="flex gap-1 rounded-lg border border-line bg-surface-2 p-1"
        role="group"
        aria-label="Switch view"
      >
        {options.map(({ key, href, label, Icon, hint }) => {
          const active = current === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              title={hint}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5",
                "text-[12.5px] font-medium transition-colors",
                active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              <Icon size={13} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
