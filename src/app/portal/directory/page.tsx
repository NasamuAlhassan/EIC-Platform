import type { Metadata } from "next";
import { Mail, Phone, Search, Users, EyeOff } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal";
import { can, ROLE_LABEL, ALL_ROLES } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import {
  Avatar,
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id}>
              <Card className="h-full p-4">
                <div className="flex items-start gap-3.5">
                  <Avatar name={m.name} src={m.avatarUrl} size={48} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[15.5px] font-medium">
                        {m.name}
                      </h2>
                      {m.id === user.id ? <Badge tone="brand">You</Badge> : null}
                      {m.isExecutive ? <Badge tone="accent">Exec</Badge> : null}
                    </div>

                    <p className="mt-0.5 text-[13px] text-ink-2">
                      {m.position ?? ROLE_LABEL[m.role]}
                    </p>
                    <p className="text-[12.5px] text-ink-3">
                      {m.classYear ? `${m.classYear} · ` : ""}
                      Joined {formatDate(m.joinedAt)}
                    </p>

                    {m.bio ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                        {m.bio}
                      </p>
                    ) : null}

                    <div className="mt-2.5 space-y-1">
                      {visibleEmail(m) ? (
                        <a
                          href={`mailto:${m.email}`}
                          className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand"
                        >
                          <Mail size={13} className="shrink-0" aria-hidden />
                          <span className="truncate">{m.email}</span>
                        </a>
                      ) : (
                        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                          <EyeOff size={13} className="shrink-0" aria-hidden />
                          Email hidden
                        </p>
                      )}

                      {visiblePhone(m) ? (
                        <a
                          href={`tel:${m.phone}`}
                          className="flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-brand"
                        >
                          <Phone size={13} className="shrink-0" aria-hidden />
                          {m.phone}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
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
