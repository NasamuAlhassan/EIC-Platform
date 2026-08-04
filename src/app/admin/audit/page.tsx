import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Download } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/portal";
import { formatFullDate, formatTime, timeAgo, cn } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";

export const metadata: Metadata = { title: "Activity log" };

const PER_PAGE = 60;

/** Colour-code by what the action does, not which entity it touches. */
function toneFor(action: string) {
  if (action.includes("delete")) return "danger" as const;
  if (action.includes("create") || action.includes("upload")) return "ok" as const;
  if (action.includes("password") || action.includes("role")) return "warn" as const;
  return "neutral" as const;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.AuditLogWhereInput = q
    ? {
        OR: [
          { actorName: { contains: q, mode: "insensitive" as const } },
          { summary: { contains: q, mode: "insensitive" as const } },
          { action: { contains: q, mode: "insensitive" as const } },
          { entityType: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.auditLog.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Group by day so a long list stays readable.
  const byDay = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    const key = formatFullDate(e.createdAt);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Who did what, and when. Entries are kept even after a member leaves."
        action={
          <ButtonLink href="/api/export" size="sm" variant="secondary">
            <Download size={15} aria-hidden />
            Export data
          </ButtonLink>
        }
      />

      <form method="get" className="mb-5">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by person, action, or description…"
          aria-label="Search the activity log"
        />
      </form>

      <p className="mb-4 text-[13px] text-ink-3">
        {total} {total === 1 ? "entry" : "entries"}
        {q ? <> matching “{q}”</> : null}
      </p>

      {entries.length > 0 ? (
        <>
          <div className="space-y-6">
            {Object.entries(byDay).map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
                  {day}
                </h2>
                <Card className="divide-y divide-line">
                  {list.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="w-16 shrink-0 pt-0.5 text-[12px] text-ink-3 tabular-nums">
                        {formatTime(e.createdAt)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px]">
                          <span className="font-medium">{e.actorName}</span>{" "}
                          <span className="text-ink-2">{e.summary}</span>
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-3">
                          {e.entityType}
                          {e.entityId ? ` · ${e.entityId.slice(0, 8)}` : ""} ·{" "}
                          {timeAgo(e.createdAt)}
                        </p>
                      </div>

                      <Badge tone={toneFor(e.action)}>{e.action}</Badge>
                    </div>
                  ))}
                </Card>
              </section>
            ))}
          </div>

          {pages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-center gap-1.5"
              aria-label="Pagination"
            >
              {Array.from({ length: Math.min(pages, 12) }, (_, i) => i + 1).map(
                (n) => (
                  <Link
                    key={n}
                    href={`/admin/audit?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(n !== 1 ? { page: String(n) } : {}),
                    })}`}
                    aria-current={n === page ? "page" : undefined}
                    className={cn(
                      "grid h-9 min-w-9 place-items-center rounded-md px-2.5 text-sm",
                      n === page
                        ? "bg-brand font-medium text-brand-ink"
                        : "border border-line text-ink-2 hover:border-brand hover:text-brand",
                    )}
                  >
                    {n}
                  </Link>
                ),
              )}
            </nav>
          ) : null}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={<ScrollText size={20} />}
            title={q ? "Nothing matched" : "No activity recorded yet"}
            description="Uploads, role changes, and deletions are recorded here automatically."
          />
        </Card>
      )}
    </div>
  );
}
