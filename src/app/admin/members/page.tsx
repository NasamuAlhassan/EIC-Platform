import type { Metadata } from "next";
import { Users, PhoneOff, MessageSquareWarning } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { ALL_ROLES, ROLE_LABEL, ROLE_DESCRIPTION } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { normalisePhone } from "@/lib/sms";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { CreateMemberForm, MemberRow } from "./member-forms";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const admin = await requireRole("ADMIN");
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const roleFilter = params.role ?? "";
  const statusFilter = params.status ?? "";

  const where: Prisma.UserWhereInput = {
    ...(ALL_ROLES.includes(roleFilter as Role)
      ? { role: roleFilter as Role }
      : {}),
    ...(["INVITED", "ACTIVE", "ARCHIVED"].includes(statusFilter)
      ? { status: statusFilter as "INVITED" | "ACTIVE" | "ARCHIVED" }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { position: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [members, counts] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ status: "asc" }, { role: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        position: true,
        phone: true,
        smsNotifications: true,
        avatarUrl: true,
        isExecutive: true,
        execOrder: true,
        joinedAt: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
    }),
    db.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const countFor = (r: Role) =>
    counts.find((c) => c.role === r)?._count ?? 0;

  // Anyone an urgent text would silently skip.
  const unreachable = members.filter(
    (m) =>
      m.status !== "ARCHIVED" &&
      (!normalisePhone(m.phone) || !m.smsNotifications),
  ).length;

  return (
    <div>
      <PageHeader
        title="Members"
        description="Add members, change roles, and control who can sign in."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ALL_ROLES.map((r) => (
          <Card key={r} className="p-3.5">
            <p className="text-[11.5px] uppercase tracking-wider text-ink-3">
              {ROLE_LABEL[r]}
            </p>
            <p className="mt-1 font-serif text-[22px] font-semibold tabular-nums">
              {countFor(r)}
            </p>
          </Card>
        ))}
      </div>

      {unreachable > 0 ? (
        <Alert
          tone="warn"
          title={`${unreachable} of ${members.length} members can't be reached by urgent SMS`}
          className="mb-6"
        >
          <p className="mt-1">
            They have no usable mobile number, or have switched SMS off. Add
            their numbers in the rows below — an urgent broadcast silently skips
            anyone without one.
          </p>
          <Link
            href="/admin/broadcast"
            className="mt-2 inline-flex items-center gap-1.5 font-medium underline"
          >
            <MessageSquareWarning size={13} aria-hidden />
            Go to Urgent SMS
          </Link>
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardHeader
          title="Add a member"
          description="They receive a temporary password by email and must change it on first sign-in."
        />
        <div className="p-5">
          <CreateMemberForm />
        </div>
      </Card>

      <form method="get" className="mb-4 flex flex-col gap-2.5 sm:flex-row">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, or position…"
          aria-label="Search members"
          className="flex-1"
        />
        <Select
          name="role"
          defaultValue={roleFilter}
          aria-label="Filter by role"
          className="sm:w-44"
        >
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        <Select
          name="status"
          defaultValue={statusFilter}
          aria-label="Filter by status"
          className="sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INVITED">Invited</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <button
          type="submit"
          className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-sm font-medium hover:bg-surface-2"
        >
          Filter
        </button>
      </form>

      {members.length > 0 ? (
        <div className="space-y-4">
          {members.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                <Avatar name={m.name} src={m.avatarUrl} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{m.name}</p>
                    {m.id === admin.id ? <Badge tone="brand">You</Badge> : null}
                    {m.status === "ARCHIVED" ? (
                      <Badge tone="danger">Archived</Badge>
                    ) : m.status === "INVITED" ? (
                      <Badge tone="warn">Invited</Badge>
                    ) : null}
                    {m.mustChangePassword ? (
                      <Badge tone="warn">Temp password</Badge>
                    ) : null}
                    {!normalisePhone(m.phone) ? (
                      <Badge tone="neutral">
                        <PhoneOff size={10} aria-hidden />
                        No mobile
                      </Badge>
                    ) : !m.smsNotifications ? (
                      <Badge tone="neutral">SMS off</Badge>
                    ) : null}
                    {m.isExecutive ? <Badge tone="accent">Exec</Badge> : null}
                  </div>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {m.email} · joined {formatDate(m.joinedAt)}
                    {m.lastLoginAt
                      ? ` · last seen ${formatDate(m.lastLoginAt)}`
                      : " · never signed in"}
                  </p>
                </div>
                <Badge tone="neutral">{ROLE_LABEL[m.role]}</Badge>
              </div>

              <MemberRow member={m} isSelf={m.id === admin.id} />
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Users size={20} />}
            title="No members matched"
            description="Try clearing the filters."
          />
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader title="What each role can do" />
        <ul className="divide-y divide-line">
          {ALL_ROLES.map((r) => (
            <li key={r} className="px-5 py-3.5">
              <p className="text-[14px] font-medium">{ROLE_LABEL[r]}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                {ROLE_DESCRIPTION[r]}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
