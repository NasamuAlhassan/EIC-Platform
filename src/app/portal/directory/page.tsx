import type { Metadata } from "next";
import { Mail, Phone, Search, Users } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { can, ROLE_LABEL, ALL_ROLES } from "@/lib/rbac";
import { initials } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";

export const metadata: Metadata = { title: "Directory" };

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const params = await searchParams;
  const user = await getPortalUser();

  const q = params.q?.trim() ?? "";
  const roleFilter = params.role ?? "";

  const where: Prisma.UserWhereInput = {
    status: "ACTIVE",
    ...(ALL_ROLES.includes(roleFilter as Role)
      ? { role: roleFilter as Role }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { position: { contains: q, mode: "insensitive" as const } },
            { classYear: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const members = await db.user.findMany({
    where,
    orderBy: [{ isExecutive: "desc" }, { execOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      position: true,
      classYear: true,
      avatarUrl: true,
      bio: true,
      isExecutive: true,
      joinedAt: true,
      showEmail: true,
      showPhone: true,
    },
  });

  // Administrators can always reach a member; everyone else sees only what the
  // member chose to share.
  const isAdmin = can.manageMembers(user.role);
  const visibleEmail = (m: (typeof members)[number]) =>
    m.showEmail || isAdmin || m.id === user.id;
  const visiblePhone = (m: (typeof members)[number]) =>
    Boolean(m.phone) && (m.showPhone || isAdmin || m.id === user.id);

  return (
    <div>
      <PageHeader
        title="Member directory"
        description="Everyone currently on the Board. Contact details are shown only where a member has chosen to share them."
      />

      <form method="get" className="mb-5 flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name, position, or class…"
            aria-label="Search members"
            className="pl-9"
          />
        </div>
        <Select
          name="role"
          defaultValue={roleFilter}
          aria-label="Filter by role"
          className="sm:w-48"
        >
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-sm font-medium hover:bg-surface-2"
        >
          Search
        </button>
      </form>

      <p className="mb-4 text-[13px] text-ink-3">
        {members.length} {members.length === 1 ? "member" : "members"}
      </p>

      {members.length > 0 ? (
        /*
          Portraits, not 48px avatars. The public About page gives executives a
          proper portrait; showing the same people as thumbnails to their own
          colleagues was the odd one out.

          Smaller than About, though — this is a directory of fifty people you
          search and scan, not five you are being introduced to. Three up on a
          phone keeps most of a class visible at once.
        */
        <ul className="grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 lg:grid-cols-5">
          {members.map((m) => (
            <li key={m.id} className="min-w-0">
              <div className="arch overflow-hidden border border-line-2 bg-surface-2">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="grid aspect-[3/4] w-full place-items-center">
                    <span
                      aria-hidden
                      className="font-serif text-[24px] leading-none text-ink-3"
                    >
                      {initials(m.name)}
                    </span>
                  </div>
                )}
              </div>

              <h2 className="mt-2 font-serif text-[15px] leading-tight">
                {m.name}
              </h2>
              <p className="label mt-1 truncate">
                {m.position ?? ROLE_LABEL[m.role]}
              </p>

              {m.id === user.id || m.isExecutive ? (
                <p className="mt-1.5 flex flex-wrap gap-1">
                  {m.id === user.id ? <Badge tone="brand">You</Badge> : null}
                  {m.isExecutive ? <Badge tone="accent">Exec</Badge> : null}
                </p>
              ) : null}

              {/* Contact details stay, but quietly. They are why someone opens
                  the directory, not why they browse it. */}
              <div className="mt-1.5 space-y-0.5">
                {visibleEmail(m) ? (
                  <a
                    href={`mailto:${m.email}`}
                    className="flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-brand"
                  >
                    <Mail size={11} className="shrink-0" aria-hidden />
                    <span className="truncate">{m.email}</span>
                  </a>
                ) : null}
                {visiblePhone(m) ? (
                  <a
                    href={`tel:${m.phone}`}
                    className="flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-brand"
                  >
                    <Phone size={11} className="shrink-0" aria-hidden />
                    <span className="truncate">{m.phone}</span>
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <EmptyState
            icon={<Users size={20} />}
            title="No members matched"
            description="Try a different name, or clear the role filter."
          />
        </Card>
      )}
    </div>
  );
}
